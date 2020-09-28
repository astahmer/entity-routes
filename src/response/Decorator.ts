import { EntityMetadata, getRepository } from "typeorm";
import { Container, Service } from "typedi";
import { isDate } from "class-validator";

import { GenericEntity } from "@/router/EntityRouter";
import { isEntity, isPrimitive } from "@/functions/asserts";
import { MappingManager } from "@/mapping/MappingManager";
import { isDev } from "@/functions/asserts";
import { ObjectLiteral } from "@/utils-types";

@Service()
/** Recursively traverses an item to decorate it */
export class Decorator {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    /** Return a decorated clone of item */
    public async decorateItem<Entity extends GenericEntity = GenericEntity, Fn = DecorateFn>({
        clone: initialClone,
        rootItem,
        rootMetadata,
        data,
        decorateFn,
    }: DecorateItemArgs<Entity, Fn>) {
        // Store props promises
        const promises: Promise<any>[] = [];

        const clone = this.recursiveDecorateItem<Entity>({
            item: rootItem,
            rootMetadata,
            clone: initialClone,
            data,
            decorateFn: decorateFn as any,
            promises,
            isRoot: true,
        });

        // Wait for props to be all set
        await Promise.all(promises);

        return clone;
    }

    /** Recursively traverse item properties */
    private recursiveDecorateItem<Entity extends GenericEntity>({
        item,
        rootMetadata,
        clone,
        data,
        decorateFn,
        promises,
        isRoot,
    }: RecursiveDecorateItemArgs<Entity>): Entity {
        let key: string, prop: any, entityMetadata: EntityMetadata;
        try {
            entityMetadata = isRoot ? rootMetadata : getRepository(item.constructor.name).metadata;
        } catch (error) {
            return item;
        }

        // If clone is null that means we are at item's root
        const cloneRef = { ref: clone || {} };

        // Wrap in promise and keep looping through items rather than wait for it to complete
        // = make parallel calls rather than sequentials
        const makePromise = (args: {
            cloneRef: { ref: any };
            nestedItem: Entity;
            nestedClone: any;
            itemMetadata: EntityMetadata;
            isRoot?: boolean;
        }): Promise<void> => {
            const { nestedItem, itemMetadata, isRoot } = args;
            return new Promise((resolve) =>
                // Wrap in promise in case the decorateFn is not async
                new Promise((res) =>
                    res(
                        decorateFn({
                            rootMetadata,
                            data,
                            clone: args.nestedClone,
                            cloneRef,
                            item: nestedItem,
                            itemMetadata,
                            isRoot,
                        })
                    )
                )
                    .then(resolve)
                    .catch((error) => {
                        isDev() && console.error(error);
                        resolve();
                    })
            );
        };
        for (key in item) {
            prop = item[key as keyof Entity];
            // TODO allow custom if (from options) ?
            if (Array.isArray(prop) && !this.mappingManager.isPropSimple(entityMetadata, key)) {
                const propArray: Entity[] = [];
                let i = 0;
                let nestedClone;
                for (i; i < prop.length; i++) {
                    nestedClone = {};
                    const nestedCloneRef = { ref: nestedClone };
                    try {
                        promises.push(
                            makePromise({
                                cloneRef: nestedCloneRef,
                                nestedItem: prop[i],
                                nestedClone: nestedCloneRef.ref,
                                itemMetadata: getRepository(prop[i].constructor.name).metadata,
                            })
                        );
                    } catch (error) {}
                    propArray.push(
                        this.recursiveDecorateItem({
                            item: prop[i],
                            clone: nestedCloneRef.ref,
                            data,
                            rootMetadata,
                            promises,
                            decorateFn,
                        })
                    );
                }

                cloneRef.ref[key] = propArray;
            } else if (isEntity(prop)) {
                try {
                    promises.push(
                        makePromise({
                            cloneRef,
                            nestedItem: item,
                            nestedClone: cloneRef.ref,
                            itemMetadata: getRepository(item.constructor.name).metadata,
                        })
                    );
                } catch (error) {}

                cloneRef.ref[key] = this.recursiveDecorateItem({
                    item: prop,
                    clone: cloneRef.ref,
                    data,
                    rootMetadata,
                    promises,
                    decorateFn,
                });
            } else if (isPrimitive(prop) || isDate(prop) || this.mappingManager.isPropSimple(entityMetadata, key)) {
                cloneRef.ref[key] = prop;
            }
        }

        promises.push(
            makePromise({ cloneRef, nestedItem: item, nestedClone: cloneRef.ref, itemMetadata: entityMetadata, isRoot })
        );

        return cloneRef.ref;
    }
}

type RecursiveDecorateItemArgs<Entity extends GenericEntity> = Omit<
    DecorateFnArgs<Entity>,
    "itemMetadata" | "cloneRef"
> &
    Pick<DecorateItemArgs<Entity>, "decorateFn"> & {
        promises: Promise<any>[];
    };

export type DecorateFnArgs<Entity extends GenericEntity = GenericEntity, Data = ObjectLiteral> = Pick<
    DecorateItemArgs<Entity, DecorateFn<Entity, Data>>,
    "clone" | "rootMetadata" | "data"
> & {
    /** Current clone object reference, allows to re-assign clone value directly */
    cloneRef: { ref: any };
    /** Current entity being decorated */
    item: Entity;
    /** Current entity metadata */
    itemMetadata: EntityMetadata;
    /** Is item the root item */
    isRoot?: boolean;
};
export type DecorateFn<Entity extends GenericEntity = GenericEntity, Data = ObjectLiteral> = (
    args: DecorateFnArgs<Entity, Data>
) => Promise<void> | void;

export type DecorateItemArgs<Entity extends GenericEntity = GenericEntity, Fn = DecorateFn> = {
    /** Current clone onto which properties should be added */
    clone?: any;
    /** Root item to decorate */
    rootItem: Entity;
    /** Root item entity metadata */
    rootMetadata: EntityMetadata;
    /** Decorator function called on each item recursively */
    decorateFn: Fn;
    /** Data to pass to decorateFn */
    data?: Fn extends DecorateFn<any, infer Data> ? Data : ObjectLiteral;
};
