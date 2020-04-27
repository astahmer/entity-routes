import { EntityMetadata, getRepository, SelectQueryBuilder } from "typeorm";
import { isPrimitive } from "util";

import { getDependsOnMetadata } from "@/mapping/decorators/DependsOn";
import { ALIAS_PREFIX, COMPUTED_PREFIX, RouteOperation } from "@/mapping/decorators/Groups";

import { EntityRouteOptions, GenericEntity } from "@/services/EntityRoute";
import { sortObjectByKeys } from "@/functions/object";
import { lowerFirstLetter } from "@/functions/primitives";

import { isType, isEntity } from "@/functions/asserts";
import { RequestContext } from "@/services";
import Container, { Service } from "typedi";
import { MappingManager } from "@/services/MappingManager";
import { AliasManager } from "@/serializer/AliasManager";

export type NormalizerOptions = Pick<
    EntityRouteOptions,
    "shouldMaxDepthReturnRelationPropsId" | "shouldEntityWithOnlyIdBeFlattenedToIri" | "shouldSetSubresourcesIriOnItem"
>;
@Service()
export class Normalizer {
    get manager() {
        return Container.get(MappingManager);
    }

    /** Retrieve collection of entities with only exposed props (from groups) */
    public async getCollection<Entity extends GenericEntity>(
        entityMetadata: EntityMetadata,
        qb: SelectQueryBuilder<Entity>,
        aliasManager: AliasManager,
        operation: RouteOperation = "list",
        options: EntityRouteOptions
    ): Promise<[Entity[], number]> {
        const selectProps = this.manager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        this.joinAndSelectExposedProps(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            "",
            entityMetadata.tableName,
            options,
            aliasManager
        );
        this.joinAndSelectPropsThatComputedPropsDependsOn(entityMetadata, operation, qb, entityMetadata, aliasManager);

        const results = await qb.getManyAndCount();
        const items = await Promise.all(
            results[0].map((item) => this.recursiveFormatItem(item, operation, entityMetadata, options))
        );

        return [items, results[1]];
    }

    /** Retrieve a specific entity with only exposed props (from groups) */
    public async getItem<Entity extends GenericEntity>(
        entityMetadata: EntityMetadata,
        qb: SelectQueryBuilder<Entity>,
        aliasManager: AliasManager,
        entityId: RequestContext["entityId"],
        operation: RouteOperation = "details",
        options: EntityRouteOptions
    ) {
        const selectProps = this.manager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        // If item is a subresource, there is no entityId since the entity was joined on its parent using inverse side prop
        if (entityId) {
            qb.where(entityMetadata.tableName + ".id = :id", { id: entityId });
        }

        this.joinAndSelectExposedProps(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            "",
            entityMetadata.tableName,
            options,
            aliasManager
        );
        this.joinAndSelectPropsThatComputedPropsDependsOn(entityMetadata, operation, qb, entityMetadata, aliasManager);

        const result = await qb.getOne();

        // Item doesn't exist
        if (!result) {
            throw new Error("Not found.");
        }

        const item: Entity = await this.recursiveFormatItem(result, operation, entityMetadata, options);

        return item;
    }

    /**
     *Add left joins to get a nested property

     * @param qb current queryBuilder instance
     * @param entityMetadata current meta to search column or relation in
     * @param propPath dot delimited property path leading to a nested property
     * @param currentProp current propPath part used, needed to find column or relation meta
     * @param prevAlias previous alias used to joins on current entity props
     */
    public makeJoinsFromPropPath(
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        propPath: string,
        currentProp: string,
        aliasManager: AliasManager,
        prevAlias?: string
    ): any {
        const column = entityMetadata.findColumnWithPropertyName(currentProp);
        const relation = column ? column.relationMetadata : entityMetadata.findRelationWithPropertyPath(currentProp);

        // Flat primitive property OR enum/simple-json/simple-array
        if (column && !relation) {
            return {
                entityAlias: prevAlias || entityMetadata.tableName,
                propName: column.databaseName,
                columnMeta: column,
            };
        } else {
            // Relation
            const { isJoinAlreadyMade, alias } = aliasManager.getAliasForRelation(qb, relation);

            if (!isJoinAlreadyMade) {
                qb.leftJoin((prevAlias || relation.entityMetadata.tableName) + "." + relation.propertyName, alias);
            }

            const splitPath = propPath.split(".");
            const nextPropPath = splitPath.slice(1).join(".");

            return this.makeJoinsFromPropPath(
                qb,
                relation.inverseEntityMetadata,
                nextPropPath,
                splitPath[1],
                aliasManager,
                alias
            );
        }
    }

    /**
     * Recursively :
     * - Remove any object that is not another Entity or is not a Date
     * - Flatten item with only id if needed
     * - Set subresources IRI if item has any
     * - Add computed props to this item
     * - Sort item's property keys
     * */
    public async recursiveFormatItem<Entity extends GenericEntity>(
        item: Entity,
        operation: RouteOperation,
        rootMetadata: EntityMetadata,
        options: EntityRouteOptions
    ): Promise<Entity> {
        let key, prop, entityMetadata;
        try {
            const repository = getRepository(item.constructor.name);
            entityMetadata = repository.metadata;
        } catch (error) {
            return item;
        }

        for (key in item) {
            prop = item[key as keyof Entity];
            if (Array.isArray(prop) && !this.manager.isPropSimple(entityMetadata, key)) {
                const propArray = prop.map((nestedItem: Entity) =>
                    this.recursiveFormatItem(nestedItem, operation, rootMetadata, options)
                );
                item[key as keyof Entity] = (await Promise.all(propArray)) as any;
            } else if (isType<GenericEntity>(prop, isEntity(prop))) {
                item[key as keyof Entity] = await this.recursiveFormatItem(prop, operation, rootMetadata, options);
            } else if (
                !isPrimitive(prop) &&
                !((prop as any) instanceof Date) &&
                !this.manager.isPropSimple(entityMetadata, key)
            ) {
                delete item[key as keyof Entity];
            }

            // TODO Remove properties selected by DependsOn ? options in Route>App ? default = true
        }

        if (options.shouldEntityWithOnlyIdBeFlattenedToIri && isEntity(item) && Object.keys(item).length === 1) {
            item = item.getIri() as any;
            return item;
        } else {
            await this.setComputedPropsOnItem(rootMetadata, item, operation, entityMetadata);
            if (options.shouldSetSubresourcesIriOnItem) {
                this.setSubresourcesIriOnItem(item, entityMetadata);
            }
            return sortObjectByKeys(item);
        }
    }

    /**
     * Add recursive left joins & selects to QueryBuilder on exposed props for a given operation with a given entityMetadata
     *
     * @param operation used to get exposed props for this operation
     * @param qb current QueryBuilder
     * @param entityMetadata used to select exposed props & joins relations
     * @param currentPath dot delimited path to keep track of the nesting max depth
     * @param prevProp used to left join further
     */
    private joinAndSelectExposedProps(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        currentPath: string,
        prevProp: string,
        options: EntityRouteOptions,
        aliasManager: AliasManager
    ) {
        if (prevProp && prevProp !== entityMetadata.tableName) {
            const selectProps = this.manager.getSelectProps(rootMetadata, operation, entityMetadata, true, prevProp);
            qb.addSelect(selectProps);
        }

        const newPath = (currentPath ? currentPath + "." : "") + entityMetadata.tableName;
        const relationProps = this.manager.getRelationPropsMetas(rootMetadata, operation, entityMetadata);

        relationProps.forEach((relation) => {
            const circularProp = this.manager.isRelationPropCircular(
                newPath + "." + relation.inverseEntityMetadata.tableName,
                relation.inverseEntityMetadata,
                relation,
                options
            );

            const { isJoinAlreadyMade, alias } = aliasManager.getAliasForRelation(qb, relation);

            if (!isJoinAlreadyMade && (!circularProp || options.shouldMaxDepthReturnRelationPropsId)) {
                qb.leftJoin(prevProp + "." + relation.propertyName, alias);
            }

            if (!circularProp) {
                this.joinAndSelectExposedProps(
                    rootMetadata,
                    operation,
                    qb,
                    relation.inverseEntityMetadata,
                    newPath,
                    alias,
                    options,
                    aliasManager
                );
                this.joinAndSelectPropsThatComputedPropsDependsOn(
                    rootMetadata,
                    operation,
                    qb,
                    relation.inverseEntityMetadata,
                    aliasManager,
                    alias
                );
            } else if (options.shouldMaxDepthReturnRelationPropsId) {
                qb.addSelect(alias + ".id");
            }
        });
    }

    /** Join and select any props marked as needed for each computed prop (with @DependsOn) in order to be able to retrieve them later */
    private joinAndSelectPropsThatComputedPropsDependsOn(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        aliasManager: AliasManager,
        alias?: string
    ) {
        const dependsOnMeta = getDependsOnMetadata(entityMetadata.target as Function);
        const computedProps = this.manager
            .getComputedProps(rootMetadata, operation, entityMetadata)
            .map(getComputedPropMethodAndKey);
        computedProps.forEach((computed) => {
            if (dependsOnMeta[computed.computedPropMethod]) {
                dependsOnMeta[computed.computedPropMethod].forEach((propPath) => {
                    const props = propPath.split(".");
                    const { entityAlias, propName } = this.makeJoinsFromPropPath(
                        qb,
                        entityMetadata,
                        propPath,
                        props[0],
                        aliasManager
                    );

                    const selectProp = (alias || entityAlias) + "." + propName;
                    const isAlredySelected = qb.expressionMap.selects.find((select) => select.selection === selectProp);

                    if (!isAlredySelected) {
                        qb.addSelect([selectProp]);
                    }
                });
            }
        });
    }

    private async setComputedPropsOnItem<U extends GenericEntity>(
        rootMetadata: EntityMetadata,
        item: U,
        operation: RouteOperation,
        entityMetadata: EntityMetadata
    ) {
        const computedProps = this.manager
            .getComputedProps(rootMetadata, operation, entityMetadata)
            .map((computed) => getComputedPropMethodAndKey(computed));
        const propsPromises = await Promise.all(
            computedProps.map((computed) => (item[computed.computedPropMethod as keyof U] as any)())
        );
        propsPromises.forEach((result, i) => (item[computedProps[i].propKey as keyof U] = result));
    }

    /** For each item's subresources, add their corresponding IRIs to this item */
    private setSubresourcesIriOnItem<U extends GenericEntity>(item: U, entityMetadata: EntityMetadata) {
        const subresourceProps = this.manager.getSubresourceProps(entityMetadata);

        let key;
        for (key in subresourceProps) {
            if (!item[key as keyof U]) {
                (item as any)[key as keyof U] = item.getIri() + "/" + key;
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
