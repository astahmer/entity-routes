import { SelectQueryBuilder, EntityMetadata } from "typeorm";
import { Container } from "typedi/Container";

import { getComputedPropMethodAndKey } from "@/response/Formater";
import { AliasHandler } from "@/mapping/AliasHandler";
import { RouteOperation } from "@/decorators/Groups";
import { EntityRouteOptions, GenericEntity } from "@/router/EntityRouter";
import { getDependsOnMetadata } from "@/decorators/DependsOn";
import { MappingManager } from "@/mapping/MappingManager";
import { SubresourceRelation } from "@/router/SubresourceManager";
import { Service } from "typedi";
import { MaxDeptMetadata, getMaxDepthMetadata } from "@/decorators/MaxDepth";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { isDev } from "@/functions/asserts";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

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
    public makeJoinsFromPropPath(
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        propPath: string,
        currentProp: string,
        aliasHandler: AliasHandler,
        prevAlias?: string
    ): { entityAlias: string; propName: string; columnMeta: ColumnMetadata } {
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
            const { isJoinAlreadyMade, alias } = aliasHandler.getAliasForRelation(qb, relation);

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
                aliasHandler,
                alias
            );
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
    public joinAndSelectExposedProps(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        currentPath: string,
        prevProp: string,
        options: JoinAndSelectExposedPropsOptions,
        aliasHandler: AliasHandler
    ) {
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
            const circularProp = this.isRelationPropCircular(
                newPath + "." + relation.inverseEntityMetadata.tableName,
                relation.inverseEntityMetadata,
                relation,
                options
            );

            const { isJoinAlreadyMade, alias } = aliasHandler.getAliasForRelation(qb, relation);
            const joinProp = prevProp + "." + relation.propertyName;

            if (!circularProp) {
                !isJoinAlreadyMade && qb.leftJoin(joinProp, alias);

                this.joinAndSelectExposedProps(
                    rootMetadata,
                    operation,
                    qb,
                    relation.inverseEntityMetadata,
                    newPath,
                    alias,
                    options,
                    aliasHandler
                );
                this.joinAndSelectPropsThatComputedPropsDependsOn(
                    rootMetadata,
                    operation,
                    qb,
                    relation.inverseEntityMetadata,
                    aliasHandler,
                    alias
                );
            } else if (options.shouldMaxDepthReturnRelationPropsId) {
                !isJoinAlreadyMade && qb.leftJoin(joinProp, alias);
                qb.addSelect(alias + ".id");
            }
        });
    }

    /** Join and select any props marked as needed for each computed prop (with @DependsOn) in order to be able to retrieve them later */
    public joinAndSelectPropsThatComputedPropsDependsOn(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        aliasHandler: AliasHandler,
        alias?: string
    ) {
        const dependsOnMeta = getDependsOnMetadata(entityMetadata.target as Function);
        if (!Object.keys(dependsOnMeta).length) return;

        const computedProps = this.mappingManager
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
                        aliasHandler
                    );

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
    public joinSubresourceOnInverseSide<Entity extends GenericEntity>(
        qb: SelectQueryBuilder<Entity>,
        entityMetadata: EntityMetadata,
        aliasHandler: AliasHandler,
        subresourceRelation: SubresourceRelation,
        prevAlias?: string
    ) {
        const relation = subresourceRelation.relation;
        if (!relation.inverseRelation) {
            throw new Error(
                `Subresources require an inverseRelation to be set, missing for ${relation.entityMetadata.tableName}.${relation.propertyName}`
            );
        }

        const property = (prevAlias || entityMetadata.tableName) + "." + relation.inverseSidePropertyPath;
        const alias = aliasHandler.getAliasForRelation(qb, relation.inverseRelation).alias;

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
    public isRelationPropCircular(
        currentPath: string,
        entityMetadata: EntityMetadata,
        relation: RelationMetadata,
        options: IsRelationPropCircularOptions = {}
    ) {
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

export type JoinAndSelectExposedPropsOptions = Pick<EntityRouteOptions, "shouldMaxDepthReturnRelationPropsId"> &
    IsRelationPropCircularOptions;

export type IsRelationPropCircularOptions = Pick<
    EntityRouteOptions,
    "defaultMaxDepthLvl" | "isMaxDepthEnabledByDefault"
>;
