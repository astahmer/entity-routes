import { EntityMetadata, getRepository } from "typeorm";
import Container, { Service } from "typedi";

import { ALIAS_PREFIX, COMPUTED_PREFIX, RouteOperation } from "@/decorators/Groups";

import { EntityRouteOptions, GenericEntity, getRouteSubresourcesMetadata } from "@/router/EntityRouter";
import { lowerFirstLetter } from "@/functions/primitives";

import { isEntity, isPrimitive } from "@/functions/asserts";
import { MappingManager } from "@/mapping/MappingManager";
import { RequestContext } from "@/router/MiddlewareMaker";
import { idToIRI, isDev, deepSort } from "@/functions/index";
import { isDate } from "class-validator";

@Service()
/** Format entity properly for a route response */
export class Formater {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    /** Return a clone with computed props set & with only serializable props */
    public async formatItem<Entity extends GenericEntity = GenericEntity>({
        item,
        operation,
        entityMetadata,
        options = {},
    }: FormaterArgs<Entity>) {
        // Store computed props promises
        const promises: Promise<any>[] = [];

        const clone = this.recursiveFormatItem<Entity>({
            item,
            clone: null,
            operation,
            rootMetadata: entityMetadata,
            promises,
            options,
        });

        // Wait for computed props to be all set
        await Promise.all(promises);

        return deepSort(clone);
    }

    /**
     * Recursively :
     * - Remove any object that is not another Entity or is not a Date
     * - Flatten item with only id if needed
     * - Set subresources IRI if item has any
     * - Add computed props to this item
     * - Sort item's property keys
     * */
    private recursiveFormatItem<Entity extends GenericEntity>({
        item,
        clone,
        operation,
        rootMetadata,
        promises,
        options = {},
    }: FormatItemArgs<Entity>): Entity {
        let key: string, prop, entityMetadata: EntityMetadata;
        try {
            entityMetadata = getRepository(item.constructor.name).metadata;
        } catch (error) {
            return item;
        }

        const computedProps = this.mappingManager.getComputedProps(rootMetadata, operation, entityMetadata);
        const shouldFlatten =
            options.shouldEntityWithOnlyIdBeFlattenedToIri &&
            isEntity(item) &&
            Object.keys(item).length === 1 &&
            !computedProps.length &&
            (options.shouldOnlyFlattenNested ? clone : true);

        if (shouldFlatten) return idToIRI(entityMetadata, item.id) as any;

        // If clone is null that means we are at item's root
        if (!clone) clone = {};

        // Wrap setComputedProps in promise and keep looping through items rather than wait for it to complete
        // = make parallel calls rather than sequentials
        const makePromise = (nestedItem: Entity, nestedClone: any, entityMetadata: EntityMetadata): Promise<void> =>
            new Promise(async (resolve) => {
                try {
                    await this.setComputedPropsOnItem(rootMetadata, nestedItem, nestedClone, operation, entityMetadata);
                    resolve();
                } catch (error) {
                    isDev() && console.error(error);
                    resolve();
                }
            });

        for (key in item) {
            prop = item[key as keyof Entity];
            if (Array.isArray(prop) && !this.mappingManager.isPropSimple(entityMetadata, key)) {
                const propArray: Entity[] = [];
                let i = 0;
                let nestedClone;
                for (i; i < prop.length; i++) {
                    nestedClone = {};
                    try {
                        promises.push(
                            makePromise(prop[i], nestedClone, getRepository(prop[i].constructor.name).metadata)
                        );
                    } catch (error) {}
                    propArray.push(
                        this.recursiveFormatItem({
                            item: prop[i],
                            clone: nestedClone,
                            operation,
                            rootMetadata,
                            promises,
                            options,
                        })
                    );
                }

                clone[key] = propArray;
            } else if (isEntity(prop)) {
                try {
                    promises.push(makePromise(item, clone, getRepository(item.constructor.name).metadata));
                } catch (error) {}

                clone[key] = this.recursiveFormatItem({
                    item: prop,
                    clone: {},
                    operation,
                    rootMetadata,
                    promises,
                    options,
                });
            } else if (isPrimitive(prop) || isDate(prop) || this.mappingManager.isPropSimple(entityMetadata, key)) {
                clone[key] = prop;
            }

            // TODO Remove properties selected by DependsOn ? options in Route>App ? default = true
        }

        if (options.shouldSetSubresourcesIriOnItem) {
            this.setSubresourcesIriOnItem(clone, entityMetadata);
        }

        promises.push(makePromise(item, clone, getRepository(item.constructor.name).metadata));

        return clone;
    }

    private async setComputedPropsOnItem<Entity extends GenericEntity>(
        rootMetadata: EntityMetadata,
        item: Entity,
        clone: any,
        operation: RouteOperation,
        entityMetadata: EntityMetadata
    ) {
        const computedProps = this.mappingManager
            .getComputedProps(rootMetadata, operation, entityMetadata)
            .map((computed) => getComputedPropMethodAndKey(computed));
        const results = await Promise.all(
            computedProps.map((computed) => item[computed.computedPropMethod as keyof Entity]())
        );
        results.forEach((result, i) => (clone[computedProps[i].propKey as keyof Entity] = result));
    }

    /** For each item's subresources, add their corresponding IRIs to this item */
    private setSubresourcesIriOnItem<Entity extends GenericEntity>(item: Entity, entityMetadata: EntityMetadata) {
        const subresourceProps = getRouteSubresourcesMetadata(entityMetadata.target as Function).properties;

        let key;
        for (key in subresourceProps) {
            if (!item[key as keyof Entity]) {
                (item as any)[key as keyof Entity] = idToIRI(entityMetadata, item.id) + "/" + key;
            }
        }
    }
}

export type FormatItemArgs<Entity> = {
    item: Entity;
    clone: any;
    operation: RouteOperation;
    rootMetadata: EntityMetadata;
    promises: Promise<any>[];
    options?: FormaterOptions;
};

export const computedPropRegex = /^(get|is|has).+/;

/**
 * Returns a formatted version of the method name
 *
 * @param computed actual method name
 * @example makeComputedPropNameFromMethod("getIdentifier") = "identifier"
 */
export const makeComputedPropNameFromMethod = (computed: string) => {
    const regexResult = computed.match(computedPropRegex);
    if (regexResult) {
        return lowerFirstLetter(computed.replace(regexResult[1], ""));
    }

    throw new Error('A computed property method should start with either "get", "is", or "has": ' + computed);
};

/**
 * Returns actual method name without prefixes & computed prop alias for the response
 *
 * @param computed method name prefixed with COMPUTED_PREFIX & ALIAS_PREFIX/alias if there is one
 */
export const getComputedPropMethodAndKey = (computed: string) => {
    const computedPropMethod = computed.replace(COMPUTED_PREFIX, "").split(ALIAS_PREFIX)[0];
    const alias = computed.split(ALIAS_PREFIX)[1];
    const propKey = alias || makeComputedPropNameFromMethod(computedPropMethod);
    return { computedPropMethod, propKey };
};

export type FormaterOptions = Pick<
    EntityRouteOptions,
    "shouldEntityWithOnlyIdBeFlattenedToIri" | "shouldSetSubresourcesIriOnItem"
> & { shouldOnlyFlattenNested?: boolean };
export type FormaterArgs<Entity extends GenericEntity = GenericEntity> = Required<
    Pick<RequestContext<Entity>, "operation">
> & {
    item: Entity;
    entityMetadata: EntityMetadata;
    options?: FormaterOptions;
};
