import { SelectQueryBuilder, EntityMetadata } from "typeorm";
import { Container } from "typedi/Container";

import { getComputedPropMethodAndKey } from "@/serializer/Formater";
import { AliasManager } from "@/serializer/AliasManager";
import { RouteOperation } from "@/decorators/Groups";
import { EntityRouteOptions, GenericEntity } from "@/services/EntityRouter";
import { getDependsOnMetadata } from "@/decorators/DependsOn";
import { MappingManager, EntityMapperOptions } from "@/services/MappingManager";
import { SubresourceRelation } from "@/services/SubresourceManager";
import { Service } from "typedi";
import { MaxDeptMetas, getMaxDepthMetadata } from "@/decorators/MaxDepth";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

@Service()
export class RelationManager {
    private maxDepthMetas: MaxDeptMetas = {};

    get mappingManager() {
        return Container.get(MappingManager);
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
        options: EntityRouteOptions,
        aliasManager: AliasManager
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
    public joinAndSelectPropsThatComputedPropsDependsOn(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        qb: SelectQueryBuilder<any>,
        entityMetadata: EntityMetadata,
        aliasManager: AliasManager,
        alias?: string
    ) {
        const dependsOnMeta = getDependsOnMetadata(entityMetadata.target as Function);
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

    /** Joins a subresource on its inverse side property */
    public joinSubresourceOnInverseSide<Entity extends GenericEntity>(
        qb: SelectQueryBuilder<Entity>,
        entityMetadata: EntityMetadata,
        aliasManager: AliasManager,
        subresourceRelation: SubresourceRelation
    ) {
        const alias = aliasManager.generate(
            entityMetadata.tableName,
            subresourceRelation.relation.inverseSidePropertyPath
        );

        qb.innerJoin(
            entityMetadata.tableName + "." + subresourceRelation.relation.inverseSidePropertyPath,
            alias,
            alias + ".id = :parentId",
            { parentId: subresourceRelation.id }
        );
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
        options: EntityMapperOptions
    ) {
        const currentDepthLvl = currentPath.split(entityMetadata.tableName).length - 1;
        if (currentDepthLvl <= 1) return;

        // console.log("current: " + currentDepthLvl, entityMetadata.tableName + "." + relation.propertyName);
        const maxDepthMeta = this.getMaxDepthMetaFor(entityMetadata);

        // Most specific maxDepthLvl found (prop > class > global options)
        const maxDepthLvl =
            (maxDepthMeta && maxDepthMeta.fields[relation.inverseSidePropertyPath]) ||
            (maxDepthMeta && maxDepthMeta.depthLvl) ||
            options.defaultMaxDepthLvl;

        // Checks for global option, class & prop decorator
        const hasGlobalMaxDepth = options.isMaxDepthEnabledByDefault && currentDepthLvl >= maxDepthLvl;
        const hasLocalClassMaxDepth = maxDepthMeta && maxDepthMeta.enabled && currentDepthLvl >= maxDepthLvl;
        const hasSpecificPropMaxDepth =
            maxDepthMeta && maxDepthMeta.fields[relation.propertyName] && currentDepthLvl >= maxDepthLvl;

        // Should stop getting nested relations ?
        if (hasGlobalMaxDepth || hasLocalClassMaxDepth || hasSpecificPropMaxDepth) {
            return { prop: relation.propertyName, depth: currentDepthLvl };
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
