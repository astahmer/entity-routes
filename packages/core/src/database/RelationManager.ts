import { Service } from "typedi";
import { Container } from "typedi/Container";
import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

import { MaxDeptMetadata, RouteOperation, getDependsOnMetadata, getMaxDepthMetadata } from "../decorators";
import { isDev } from "../functions";
import { MappingManager } from "../mapping";
import { getComputedPropMethodAndKey } from "../response";
import { GenericEntity, SubresourceRelation } from "../router";
import { AliasHandler } from ".";

@Service()
export class RelationManager {
    private maxDepthMetas: Record<string, MaxDeptMetadata> = {};

    get mappingManager() {
        return Container.get(MappingManager);
    }

    /**
     * Add left joins to get a nested property
     * @param qb current queryBuilder instance
     * @param entityMetadata current meta to search column or relation in
     * @param propPath dot delimited property path leading to a nested property
     * @param currentProp current propPath part used, needed to find column or relation meta
     * @param prevAlias previous alias used to joins on current entity props
     */
    public makeJoinsFromPropPath({
        qb,
        entityMetadata,
        propPath,
        currentProp,
        aliasHandler,
        prevAlias,
    }: MakeJoinsFromPropPathArgs): { entityAlias: string; propName: string; columnMeta: ColumnMetadata } {
        const column = entityMetadata.findColumnWithPropertyName(currentProp);
        const relation = column ? column.relationMetadata : entityMetadata.findRelationWithPropertyPath(currentProp);

        if (!column && !relation) {
            isDev() && console.warn(`No prop named <${currentProp}> found in entity <${entityMetadata.tableName}>`);
            return { entityAlias: undefined, propName: undefined, columnMeta: undefined };
        }

        // Flat primitive property OR enum/simple-json/simple-array
        if (column && !relation) {
            return {
                entityAlias: prevAlias || entityMetadata.tableName,
                propName: column.databaseName,
                columnMeta: column,
            };
        } else {
            // Relation
            const { isJoinAlreadyMade, alias } = aliasHandler.getAliasForRelation(qb, relation, prevAlias);

            if (!isJoinAlreadyMade) {
                qb.leftJoin((prevAlias || relation.entityMetadata.tableName) + "." + relation.propertyName, alias);
            }

            const splitPath = propPath.split(".");
            const nextPropPath = splitPath.slice(1).join(".");

            return this.makeJoinsFromPropPath({
                qb,
                entityMetadata: relation.inverseEntityMetadata,
                propPath: nextPropPath,
                currentProp: splitPath[1],
                aliasHandler,
                prevAlias: alias,
            });
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
    public joinAndSelectExposedProps({
        rootMetadata,
        operation,
        qb,
        entityMetadata,
        currentPath,
        prevProp,
        options,
        aliasHandler,
    }: JoinAndSelectExposedPropsArgs) {
        if (prevProp && prevProp !== entityMetadata.tableName) {
            const selectProps = this.mappingManager.getSelectProps(
                rootMetadata,
                operation,
                entityMetadata,
                true,
                prevProp
            );
            qb.addSelect(selectProps);
        }

        const newPath = (currentPath ? currentPath + "." : "") + entityMetadata.tableName;
        const relationProps = this.mappingManager.getRelationPropsMetas(rootMetadata, operation, entityMetadata);

        relationProps.forEach((relation) => {
            const circularProp = this.isRelationPropCircular({
                currentPath: newPath + "." + relation.inverseEntityMetadata.tableName,
                entityMetadata: relation.inverseEntityMetadata,
                relation,
                options,
            });

            const { isJoinAlreadyMade, alias } = aliasHandler.getAliasForRelation(qb, relation);
            const joinProp = prevProp + "." + relation.propertyName;

            if (!circularProp) {
                !isJoinAlreadyMade && qb.leftJoin(joinProp, alias);

                this.joinAndSelectExposedProps({
                    rootMetadata,
                    operation,
                    qb,
                    entityMetadata: relation.inverseEntityMetadata,
                    currentPath: newPath,
                    prevProp: alias,
                    options,
                    aliasHandler,
                });
                this.joinAndSelectPropsThatComputedPropsDependsOn({
                    rootMetadata,
                    operation,
                    qb,
                    entityMetadata: relation.inverseEntityMetadata,
                    aliasHandler,
                    alias,
                });
            } else if (options.shouldMaxDepthReturnRelationPropsId) {
                !isJoinAlreadyMade && qb.leftJoin(joinProp, alias);
                qb.addSelect(alias + ".id");
            }
        });
    }

    /** Join and select any props marked as needed for each computed prop (with @DependsOn) in order to be able to retrieve them later */
    public joinAndSelectPropsThatComputedPropsDependsOn({
        rootMetadata,
        operation,
        qb,
        entityMetadata,
        aliasHandler,
        alias,
    }: JoinAndSelectPropsThatComputedPropsDependsOnArgs) {
        const dependsOnMeta = getDependsOnMetadata(entityMetadata.target as Function);
        if (!Object.keys(dependsOnMeta).length) return;

        const computedProps = this.mappingManager
            .getComputedProps(rootMetadata, operation, entityMetadata)
            .map(getComputedPropMethodAndKey);

        computedProps.forEach((computed) => {
            if (dependsOnMeta[computed.computedPropMethod]) {
                dependsOnMeta[computed.computedPropMethod].forEach((propPath) => {
                    const props = propPath.split(".");
                    const { entityAlias, propName } = this.makeJoinsFromPropPath({
                        qb,
                        entityMetadata,
                        propPath,
                        currentProp: props[0],
                        aliasHandler,
                    });

                    const selectProp = (alias || entityAlias) + "." + propName;
                    const isAlreadySelected = qb.expressionMap.selects.find(
                        (select) => select.selection === selectProp
                    );

                    if (!isAlreadySelected) {
                        qb.addSelect([selectProp]);
                    }
                });
            }
        });
    }

    /** Joins a subresource on its inverse side property */
    public joinSubresourceOnInverseSide<Entity extends GenericEntity>({
        qb,
        entityMetadata,
        aliasHandler,
        subresourceRelation,
        prevAlias,
    }: JoinSubresourceOnInverseSideArgs<Entity>) {
        const relation = subresourceRelation.relation;
        if (!relation.inverseRelation) {
            throw new Error(
                `Subresources require an inverseRelation to be set, missing for ${relation.entityMetadata.tableName}.${relation.propertyName}`
            );
        }

        const property = (prevAlias || entityMetadata.tableName) + "." + relation.inverseSidePropertyPath;
        const alias = aliasHandler.getAliasForRelation(qb, relation.inverseRelation, prevAlias).alias;

        const param = subresourceRelation.param && { parentId: subresourceRelation.id };
        const condition = subresourceRelation.param && alias + ".id = :parentId";

        qb.innerJoin(property, alias, condition, param);

        return alias;
    }

    /**
     * Checks if this prop/relation entity was already fetched
     * Should stop if this prop/relation entity has a MaxDepth decorator or if it is enabled by default
     *
     * @param currentPath dot delimited path to keep track of the nesting max depth
     * @param entityMetadata
     * @param relation
     */
    public isRelationPropCircular({ currentPath, entityMetadata, relation, options = {} }: IsRelationPropCircularArgs) {
        const currentDepthLvl = currentPath.split(entityMetadata.tableName).length - 1;
        if (currentDepthLvl < 2) return;

        const maxDepthMeta = this.getMaxDepthMetaFor(entityMetadata);

        // Most specific maxDepthLvl found (prop > class > global options)
        const maxDepthLvl =
            maxDepthMeta?.fields[relation.inverseSidePropertyPath] ||
            maxDepthMeta?.depthLvl ||
            options.defaultMaxDepthLvl;

        // Checks for global option, class & prop decorator
        const hasGlobalMaxDepth = options.isMaxDepthEnabledByDefault && currentDepthLvl >= maxDepthLvl;
        const hasLocalClassMaxDepth = maxDepthMeta?.enabled && currentDepthLvl >= maxDepthLvl;
        const hasSpecificPropMaxDepth =
            maxDepthMeta?.fields[relation.inverseSidePropertyPath] && currentDepthLvl >= maxDepthLvl;

        // Should stop getting nested relations ?
        if (hasGlobalMaxDepth || hasLocalClassMaxDepth || hasSpecificPropMaxDepth) {
            return { entityMetadata, prop: relation.propertyName, depth: currentDepthLvl };
        }
    }

    /** Retrieve & store entity maxDepthMeta for each entity */
    private getMaxDepthMetaFor(entityMetadata: EntityMetadata) {
        if (!this.maxDepthMetas[entityMetadata.tableName]) {
            this.maxDepthMetas[entityMetadata.tableName] = getMaxDepthMetadata(entityMetadata.target as Function);
        }
        return this.maxDepthMetas[entityMetadata.tableName];
    }
}

export type RelationManagerBaseArgs<Entity extends GenericEntity = GenericEntity> = {
    qb: SelectQueryBuilder<Entity>;
    entityMetadata: EntityMetadata;
    aliasHandler: AliasHandler;
};

export type MakeJoinsFromPropPathArgs<
    Entity extends GenericEntity = GenericEntity
> = RelationManagerBaseArgs<Entity> & {
    propPath: string;
    currentProp: string;
    prevAlias?: string;
};

export type JoinAndSelectExposedPropsArgs<
    Entity extends GenericEntity = GenericEntity
> = RelationManagerBaseArgs<Entity> & {
    rootMetadata: EntityMetadata;
    operation: RouteOperation;
    currentPath: string;
    prevProp: string;
    options: JoinAndSelectExposedPropsOptions;
};

export type JoinAndSelectPropsThatComputedPropsDependsOnArgs<
    Entity extends GenericEntity = GenericEntity
> = RelationManagerBaseArgs<Entity> & {
    rootMetadata: EntityMetadata;
    operation: RouteOperation;
    alias?: string;
};

export type JoinSubresourceOnInverseSideArgs<
    Entity extends GenericEntity = GenericEntity
> = RelationManagerBaseArgs<Entity> & {
    subresourceRelation: SubresourceRelation;
    prevAlias?: string;
};

export type IsRelationPropCircularArgs = {
    currentPath: string;
    entityMetadata: EntityMetadata;
    relation: RelationMetadata;
    options?: IsRelationPropCircularOptions;
};

export type JoinAndSelectExposedPropsOptions = {
    /** In case of max depth reached on a relation, should it at retrieve its id and then stop instead of just stopping ? */
    shouldMaxDepthReturnRelationPropsId?: boolean;
} & IsRelationPropCircularOptions;

export type IsRelationPropCircularOptions = {
    /** Is max depth enabled by default on all entities for any request context for this router */
    isMaxDepthEnabledByDefault?: boolean;
    /** Default level of depth at which the nesting should stop for this router */
    defaultMaxDepthLvl?: number;
};
