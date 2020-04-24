import { EntityMetadata } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

import { GroupsMetadata } from "./GroupsMetadata";
import { RouteOperation, COMPUTED_PREFIX } from "./decorators/Groups";

export class EntityGroupsMetadata extends GroupsMetadata {
    /**
     * Get exposed props that are primitives props, used in queryBuilder selects
     */
    getSelectProps(operation: RouteOperation, routeContext: EntityMetadata, withPrefix = true, prefix?: string) {
        return this.getExposedProps(operation, routeContext)
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
        return this.getExposedProps(operation, routeContext)
            .map((propName) => this.entityMeta.relations.find((rel) => rel.propertyName === propName))
            .filter((rel) => rel);
    }

    /**
     * Get exposed props that are computed props, used to retrieve themselves
     */
    getComputedProps(operation: RouteOperation, routeContext: EntityMetadata) {
        return this.getExposedProps(operation, routeContext).filter(
            (propName) => propName.indexOf(COMPUTED_PREFIX) !== -1
        );
    }

    /**
     * Returns both selects & relations props
     */
    getExposedPropsByTypes(operation: RouteOperation, routeContext: EntityMetadata) {
        const selectProps: string[] = [];
        const relationProps: RelationMetadata[] = [];

        this.getExposedProps(operation, routeContext).forEach((prop: string) => {
            const relation = this.entityMeta.relations.find((relation) => relation.propertyName === prop);
            if (relation) {
                relationProps.push(relation);
            } else {
                selectProps.push(this.entityMeta.tableName + "." + prop);
            }
        });

        return { selectProps, relationProps };
    }
}
