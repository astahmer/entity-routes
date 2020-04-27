import { path, pluck } from "ramda";
import { EntityMetadata, ObjectType } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { Service } from "typedi";

import { RouteOperation, GROUPS_METAKEY } from "@/mapping/decorators/Groups";

import { getRouteSubresourcesMetadata, EntityRouteOptions } from "@/services/EntityRoute";
import { GroupsMetadata, GroupsMetaByRoutes } from "@/mapping/GroupsMetadata";
import { EntityGroupsMetadata } from "@/mapping/EntityGroupsMetadata";
import { MaxDeptMetas, getMaxDepthMetadata } from "@/mapping";

@Service()
export class MappingManager {
    private groupsMetas: Record<string, GroupsMetaByRoutes<any>> = {};
    private maxDepthMetas: MaxDeptMetas = {};

    /** Make the mapping object for this entity on a given operation */
    public make(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        options: EntityMapperMakeOptions
    ): MappingItem | Record<string, any> {
        const mapping = this.getMappingFor(
            rootMetadata,
            {},
            operation,
            rootMetadata,
            "",
            rootMetadata.tableName,
            options
        );
        return options.pretty ? this.prettify(mapping) : mapping;
    }

    /**
     * Retrieve mapping at current path
     *
     * @param currentPath dot delimited path to keep track of the properties select nesting
     */
    public getNestedMappingAt(currentPath: string | string[], mapping: MappingItem): MappingItem {
        currentPath = Array.isArray(currentPath) ? currentPath : currentPath.split(".");
        const currentPathArray = ["mapping"].concat(currentPath.join(".mapping.").split("."));
        return path(currentPathArray, mapping);
    }

    /** Get selects props (from groups) of a given entity for a specific operation */
    public getExposedProps(rootMetadata: EntityMetadata, operation: RouteOperation, entityMetadata: EntityMetadata) {
        return this.getGroupsMetadataFor(entityMetadata, EntityGroupsMetadata).getExposedPropsOn(
            operation,
            rootMetadata
        );
    }

    /** Get selects props (from groups) of a given entity for a specific operation */
    public getSelectProps(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        entityMetadata: EntityMetadata,
        withPrefix = true,
        prefix?: string
    ) {
        return this.getGroupsMetadataFor(entityMetadata, EntityGroupsMetadata).getSelectProps(
            operation,
            rootMetadata,
            withPrefix,
            prefix
        );
    }

    /** Get relation props metas (from groups) of a given entity for a specific operation */
    public getRelationPropsMetas(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        entityMetadata: EntityMetadata
    ) {
        return this.getGroupsMetadataFor(entityMetadata, EntityGroupsMetadata).getRelationPropsMetas(
            operation,
            rootMetadata
        );
    }

    /** Get computed props metas (from groups) of a given entity for a specific operation */
    public getComputedProps(rootMetadata: EntityMetadata, operation: RouteOperation, entityMetadata: EntityMetadata) {
        return this.getGroupsMetadataFor(entityMetadata, EntityGroupsMetadata).getComputedProps(
            operation,
            rootMetadata
        );
    }

    /** Get GroupsMetada of a given entity */
    public getGroupsMetadataFor<G extends GroupsMetadata>(
        entityMetadata: EntityMetadata,
        metaClass: new (metaKey: string, entityOrMeta: EntityMetadata | ObjectType<G>) => G,
        metaKeyProp = GROUPS_METAKEY
    ): G {
        // since TS doesn't allow Symbol as index (why ??)
        const metaKey = (metaKeyProp as any) as string;
        if (!this.groupsMetas[metaKey]) {
            this.groupsMetas[metaKey] = {};
        }

        if (!this.groupsMetas[metaKey][entityMetadata.tableName]) {
            this.groupsMetas[metaKey][entityMetadata.tableName] =
                Reflect.getOwnMetadata(metaKey, entityMetadata.target) || new metaClass(metaKey, entityMetadata);
        }
        return this.groupsMetas[metaKey][entityMetadata.tableName];
    }

    /** Get subresources of a given entity */
    public getSubresourceProps(entityMetadata: EntityMetadata) {
        return getRouteSubresourcesMetadata(entityMetadata.target as Function).properties;
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
        if (currentDepthLvl > 1) {
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
                return { prop: relation.propertyName, value: "CIRCULAR lvl: " + currentDepthLvl };
            }
        }

        return null;
    }

    /** Checks that a prop is of type (simple-array | simple-json | set) */
    public isPropSimple(entityMetadata: EntityMetadata, propName: string) {
        const column = entityMetadata.findColumnWithPropertyName(propName);
        if (column) {
            const type = column.type.toString();
            return column.type.toString().includes("simple") || type === "set";
        }
    }

    /** Retrieve & store entity maxDepthMeta for each entity */
    private getMaxDepthMetaFor(entityMetadata: EntityMetadata) {
        if (!this.maxDepthMetas[entityMetadata.tableName]) {
            this.maxDepthMetas[entityMetadata.tableName] = getMaxDepthMetadata(entityMetadata.target as Function);
        }
        return this.maxDepthMetas[entityMetadata.tableName];
    }

    /**
     * Retrieve & set mapping from exposed/relations props of an entity
     *
     * @param mapping object that will be recursively written into
     * @param operation
     * @param entityMetadata
     * @param currentPath keep track of current mapping path
     * @param currentTableNamePath used to check max depth
     */
    private getMappingFor(
        rootMetadata: EntityMetadata,
        mapping: MappingResponse,
        operation: RouteOperation,
        entityMetadata: EntityMetadata,
        currentPath: string,
        currentTableNamePath: string,
        options: EntityMapperOptions
    ) {
        const selectProps = this.getSelectProps(rootMetadata, operation, entityMetadata, false);
        const relationProps = this.getRelationPropsMetas(rootMetadata, operation, entityMetadata);

        const nestedMapping: MappingItem = {
            selectProps,
            relationProps: pluck("propertyName", relationProps),
            exposedProps: selectProps.concat(pluck("propertyName", relationProps)),
            [ENTITY_META_SYMBOL]: entityMetadata,
            mapping: {},
        };

        for (let i = 0; i < relationProps.length; i++) {
            const circularProp = this.isRelationPropCircular(
                currentTableNamePath,
                relationProps[i].entityMetadata,
                relationProps[i],
                options
            );
            if (circularProp) {
                continue;
            }

            nestedMapping.mapping[relationProps[i].propertyName] = this.getMappingFor(
                rootMetadata,
                mapping,
                operation,
                relationProps[i].inverseEntityMetadata,
                currentPath + "." + relationProps[i].propertyName,
                currentTableNamePath + "." + relationProps[i].inverseEntityMetadata.tableName,
                options
            );
        }

        return nestedMapping;
    }

    /** Returns a pretty GraphQL-like (?deep) object with each property as key and type as value */
    private prettify(mapping: MappingItem) {
        const prettifyPrimitives = (acc: Record<string, string>, propName: string) => {
            const column = mapping[ENTITY_META_SYMBOL].findColumnWithPropertyName(propName);
            acc[propName] = column.type instanceof Function ? column.type.name : column.type.toString();
            return acc;
        };

        // Make pairs of primitive select props with their associated type
        // ex: { title: "String", description: "String", "isMultipartMeme": "Boolean", "visibility": "enum" }
        const primitives = mapping.selectProps.reduce(prettifyPrimitives, {});

        // Recursively make pairs of selects props & associate relation when max depth is reached with "@id" or "@id[]"
        const relations = mapping.relationProps.reduce((acc, relationName) => {
            if (Object.keys(mapping.mapping).length) {
                const nestedMapping = mapping.mapping[relationName];
                if (nestedMapping.exposedProps.length === 1 && nestedMapping.exposedProps[0] === "id") {
                    // If this relation has only exposed its id, then don't bother nesting it like entity: { id: "number "}
                    // Instead, directly associate relation with "@id" or "@id[]"
                    const relation = mapping[ENTITY_META_SYMBOL].findRelationWithPropertyPath(relationName);
                    acc[relationName] = "@id" + (relation.relationType.endsWith("to-many") ? "[]" : "");
                } else {
                    // There are still props to select deeper, recursive prettify at currentPath
                    const prettyMappingItem = this.prettify(this.getNestedMappingAt(relationName, mapping));
                    acc[relationName] = prettyMappingItem;
                }
            } else {
                const primitives = mapping.selectProps.reduce(prettifyPrimitives, {});

                // If max depth is reached, then associate relation with "@id" or "@id[]"
                const relations = mapping.relationProps.reduce((acc, propName) => {
                    const relation = mapping[ENTITY_META_SYMBOL].findRelationWithPropertyPath(propName);
                    acc[propName] = "@id" + (relation.relationType.endsWith("to-many") ? "[]" : "");
                    return acc;
                }, {} as Record<string, any>);
                acc[relationName] = { ...primitives, ...relations };
            }
            return acc;
        }, {} as Record<string, any>);

        return { ...primitives, ...relations };
    }
}

export const ENTITY_META_SYMBOL = Symbol("entityMeta");

export type MappingItem = {
    mapping: MappingResponse;
    exposedProps: string[];
    selectProps: string[];
    relationProps: string[];
    [ENTITY_META_SYMBOL]: EntityMetadata;
};

export type MappingResponse = Record<string, MappingItem>;

export type EntityMapperOptions = Pick<EntityRouteOptions, "defaultMaxDepthLvl" | "isMaxDepthEnabledByDefault">;
export type EntityMapperMakeOptions = EntityMapperOptions & {
    pretty?: boolean;
};
