import { EntityMetadata, getRepository } from "typeorm";

import { GroupsMetadata } from "./GroupsMetadata";
import { RouteOperation, COMPUTED_PREFIX, MetaKey } from "@/decorators/Groups";

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
        return this.getExposedPropsOn(operation, routeContext)
            .filter(
                (propName) =>
                    propName.indexOf(COMPUTED_PREFIX) === -1 &&
                    this.entityMeta.relations.map((rel) => rel.propertyName).indexOf(propName) === -1
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
        return this.getExposedPropsOn(operation, routeContext).filter(
            (propName) => propName.indexOf(COMPUTED_PREFIX) !== -1
        );
    }

    /**
     * Get exposed props (from groups) for a given entity (using its EntityMetadata) on a specific operation
     */
    getExposedPropsOn(operation: RouteOperation, routeContext: EntityMetadata) {
        let exposedProps = this.exposedPropsByContexts[routeContext.tableName];

        if (!exposedProps || !exposedProps[operation]) {
            exposedProps = this.getExposedProps(routeContext.tableName);
        }

        return exposedProps ? (exposedProps[operation] ? exposedProps[operation] : []) : [];
    }
}
