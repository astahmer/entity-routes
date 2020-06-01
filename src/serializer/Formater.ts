import { EntityMetadata, getRepository } from "typeorm";
import Container, { Service } from "typedi";

import { ALIAS_PREFIX, COMPUTED_PREFIX, RouteOperation } from "@/decorators/Groups";

import { EntityRouteOptions, GenericEntity, getRouteSubresourcesMetadata } from "@/router/EntityRouter";
import { sortObjectByKeys } from "@/functions/object";
import { lowerFirstLetter } from "@/functions/primitives";

import { isType, isEntity, isPrimitive } from "@/functions/asserts";
import { MappingManager } from "@/services/MappingManager";
import { RequestContext } from "@/services/index";

@Service()
export class Formater {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    /** Return a clone of this request body values with only mapped props */
    public formatItem<Entity extends GenericEntity = GenericEntity>({
        item,
        operation,
        entityMetadata,
        options = {},
    }: FormaterArgs<Entity>) {
        return this.recursiveFormatItem<Entity>(item, {}, operation, entityMetadata, options);
    }

    /**
     * Recursively :
     * - Remove any object that is not another Entity or is not a Date
     * - Flatten item with only id if needed
     * - Set subresources IRI if item has any
     * - Add computed props to this item
     * - Sort item's property keys
     * */
    private async recursiveFormatItem<Entity extends GenericEntity>(
        item: Entity,
        clone: any,
        operation: RouteOperation,
        rootMetadata: EntityMetadata,
        options: FormaterOptions = {}
    ): Promise<Entity> {
        let key: string, prop, entityMetadata;
        try {
            const repository = getRepository(item.constructor.name);
            entityMetadata = repository.metadata;
        } catch (error) {
            return item;
        }

        for (key in item) {
            prop = item[key as keyof Entity];
            if (Array.isArray(prop) && !this.mappingManager.isPropSimple(entityMetadata, key)) {
                const propArray = prop.map((nestedItem: Entity) =>
                    this.recursiveFormatItem(
                        nestedItem,
                        clone[key as keyof typeof clone] || {},
                        operation,
                        rootMetadata,
                        options
                    )
                );
                clone[key] = (await Promise.all(propArray)) as any;
            } else if (isType<GenericEntity>(prop, isEntity(prop))) {
                clone[key] = await this.recursiveFormatItem(
                    prop,
                    clone[key as keyof typeof clone] || {},
                    operation,
                    rootMetadata,
                    options
                );
            } else if (
                isPrimitive(prop) ||
                (prop as any) instanceof Date ||
                this.mappingManager.isPropSimple(entityMetadata, key)
            ) {
                clone[key] = prop;
            }

            // TODO Remove properties selected by DependsOn ? options in Route>App ? default = true
        }

        if (options.shouldEntityWithOnlyIdBeFlattenedToIri && isEntity(item) && Object.keys(item).length === 1) {
            return "getIri" in item ? item.getIri() : (("/" + entityMetadata.tableName + "/" + item.id) as any);
        } else {
            // TODO wrap setComputedProps in promise and keep looping through items rather than wait for it to complete
            // = go for parallel calls rather than sequentials
            await this.setComputedPropsOnItem(rootMetadata, item, clone, operation, entityMetadata);
            if (options.shouldSetSubresourcesIriOnItem) {
                this.setSubresourcesIriOnItem(clone, entityMetadata);
            }
            return sortObjectByKeys(clone);
        }
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
        const propsPromises = await Promise.all(
            computedProps.map((computed) => (item[computed.computedPropMethod as keyof Entity] as any)())
        );
        propsPromises.forEach((result, i) => (clone[computedProps[i].propKey as keyof Entity] = result));
    }

    /** For each item's subresources, add their corresponding IRIs to this item */
    private setSubresourcesIriOnItem<Entity extends GenericEntity>(item: Entity, entityMetadata: EntityMetadata) {
        const subresourceProps = getRouteSubresourcesMetadata(entityMetadata.target as Function).properties;

        let key;
        for (key in subresourceProps) {
            if (!item[key as keyof Entity]) {
                (item as any)[key as keyof Entity] =
                    ("getIri" in item ? item.getIri() : "/" + entityMetadata.tableName + "/" + item.id) + "/" + key;
            }
        }
    }
}

export const computedPropRegex = /^(get|is|has).+/;

/**
 * Returns a formatted version of the method name
 *
 * @param computed actual method name
 */
export const makeComputedPropNameFromMethod = (computed: string) => {
    const regexResult = computed.match(computedPropRegex);
    if (regexResult) {
        return lowerFirstLetter(computed.replace(regexResult[1], ""));
    }

    throw new Error('A computed property method should start with either "get", "is", or "has".');
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
>;
export type FormaterArgs<Entity extends GenericEntity = GenericEntity> = Pick<RequestContext<Entity>, "operation"> & {
    item: Entity;
    entityMetadata: EntityMetadata;
    options?: FormaterOptions;
};
