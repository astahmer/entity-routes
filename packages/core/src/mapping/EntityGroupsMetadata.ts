import { EntityMetadata, getRepository } from "typeorm";

import { ACCESSOR_PREFIX, COMPUTED_PREFIX, MetaKey, RouteOperation, getGroupsMetadata } from "@/decorators/Groups";
import { combineUniqueValues } from "@/functions/array";

import { GroupsMetadata, getInheritanceTree } from "./GroupsMetadata";

export class EntityGroupsMetadata extends GroupsMetadata {
    /** EntityMetadata associated with the class */
    get entityMeta() {
        if (this._cachedEntityMeta) return this._cachedEntityMeta;

        const repository = getRepository(this.entityTarget);
        this._cachedEntityMeta = repository.metadata;
        return this._cachedEntityMeta;
    }

    private _cachedEntityMeta: EntityMetadata;

    constructor(metaKey: MetaKey, entityTarget: Function) {
        super(metaKey, entityTarget);
    }

    /**
     * Get exposed props that are primitives props, used in queryBuilder selects
     */
    getSelectProps(operation: RouteOperation, routeContext: EntityMetadata, withPrefix = true, prefix?: string) {
        const relationNames = this.entityMeta.relations.map((rel) => rel.propertyName);
        return this.getExposedPropsOn(operation, routeContext)
            .filter(
                (propName) =>
                    !propName.includes(COMPUTED_PREFIX) &&
                    !propName.includes(ACCESSOR_PREFIX) &&
                    !relationNames.includes(propName)
            )
            .map((propName) => (withPrefix ? (prefix || this.entityMeta.tableName) + "." : "") + propName);
    }

    /**
     * Get exposed props that are relations props, used to retrieve nested entities
     */
    getRelationPropsMetas(operation: RouteOperation, routeContext: EntityMetadata) {
        return this.getExposedPropsOn(operation, routeContext)
            .map((propName) => this.entityMeta.relations.find((rel) => rel.propertyName === propName))
            .filter((rel) => rel);
    }

    /**
     * Get exposed props that are computed props, used to retrieve themselves
     */
    getComputedProps(operation: RouteOperation, routeContext: EntityMetadata) {
        return this.getExposedPropsOn(operation, routeContext).filter((propName) => propName.includes(COMPUTED_PREFIX));
    }

    /**
     * Get exposed props (from groups) for a given entity (using its EntityMetadata) on a specific operation
     */
    getExposedPropsOn(operation: RouteOperation, routeContext: EntityMetadata) {
        let exposedProps = this.exposedPropsByContexts[routeContext.tableName];

        if (!exposedProps || !exposedProps[operation]) {
            const isMissingOperation = exposedProps && !exposedProps[operation];
            exposedProps = this.getExposedProps(routeContext.tableName);

            // Adding always & localAlways groups for that operation since its missing here (not used directly on that entity)
            if (isMissingOperation) {
                const inheritanceTree = getInheritanceTree(this.entityTarget);
                const tableName = routeContext.tableName;

                let i = 0;
                let parentGroupsMeta: EntityGroupsMetadata;
                for (i; i < inheritanceTree.length; i++) {
                    parentGroupsMeta = getGroupsMetadata(inheritanceTree[i], this.metaKey);
                    if (!parentGroupsMeta) continue;

                    this.exposedPropsByContexts[tableName][operation] = combineUniqueValues(
                        this.exposedPropsByContexts[tableName][operation],
                        parentGroupsMeta.always,
                        parentGroupsMeta.localAlways[routeContext.tableName]
                    );
                }
            }
        }

        return exposedProps ? (exposedProps[operation] ? exposedProps[operation] : []) : [];
    }
}
