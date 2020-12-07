import { Container, Service } from "typedi";
import { EntityMetadata, ObjectType } from "typeorm";

import { JoinAndSelectExposedPropsOptions, RelationManager } from "../database";
import { GROUPS_METAKEY, RouteOperation } from "../decorators";
import { get, pluck } from "../functions";
import { ObjectLiteral } from "../utils-types";
import { EntityGroupsMetadata, GroupsMetaByRoutes, GroupsMetadata } from ".";

@Service()
export class MappingManager {
    private groupsMetas: Record<string, GroupsMetaByRoutes<any>> = {};

    get relationManager() {
        return Container.get(RelationManager);
    }

    /** Make the mapping object for this entity on a given operation */
    public make<O extends EntityMapperMakeOptions = EntityMapperMakeOptions>(
        rootMetadata: EntityMetadata,
        operation: RouteOperation,
        options: O = {} as any
    ): O extends { pretty: true } ? ObjectLiteral : MappingItem {
        const mapping = this.getMappingFor(
            rootMetadata,
            {},
            operation,
            rootMetadata,
            "",
            rootMetadata.tableName,
            options
        );
        return options.pretty ? (this.prettify(mapping) as ObjectLiteral) : (mapping as any);
    }

    /**
     * Retrieve mapping at current path
     *
     * @param currentPath dot delimited path to keep track of the properties select nesting
     */
    public getNestedMappingAt(currentPath: string | string[], mapping: MappingItem): MappingItem {
        const path = Array.isArray(currentPath) ? currentPath : currentPath.split(".");
        const mappingPath = "mapping." + path.join(".mapping.");
        return get(mapping, mappingPath);
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
                Reflect.getOwnMetadata(metaKey, entityMetadata.target) ||
                new metaClass(metaKey, entityMetadata.target as Function);
        }
        return this.groupsMetas[metaKey][entityMetadata.tableName];
    }

    public isPropSimple(entityMetadata: EntityMetadata, propName: string) {
        const column = entityMetadata.findColumnWithPropertyName(propName);
        if (!column) return false;

        const type = column.type.toString();
        return column.type.toString().includes("simple") || type === "set";
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
        options: EntityMapperOptions = {}
    ) {
        const selectProps = this.getSelectProps(rootMetadata, operation, entityMetadata, false);
        const relationProps = this.getRelationPropsMetas(rootMetadata, operation, entityMetadata);

        const relationPropNames = pluck(relationProps, "propertyName");
        const nestedMapping: MappingItem = {
            selectProps,
            relationProps: relationPropNames,
            exposedProps: selectProps.concat(relationPropNames),
            [ENTITY_META_SYMBOL]: entityMetadata,
            mapping: {},
        };

        for (let i = 0; i < relationProps.length; i++) {
            const circularProp = this.relationManager.isRelationPropCircular({
                currentPath: currentTableNamePath,
                entityMetadata: relationProps[i].entityMetadata,
                relation: relationProps[i],
                options,
            });
            if (circularProp) {
                continue;
            }

            nestedMapping.mapping[relationProps[i].propertyName] = this.getMappingFor(
                rootMetadata,
                mapping,
                operation,
                relationProps[i].inverseEntityMetadata,
                (currentPath ? currentPath + "." : "") + relationProps[i].propertyName,
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
                }, {} as ObjectLiteral);
                acc[relationName] = { ...primitives, ...relations };
            }
            return acc;
        }, {} as ObjectLiteral);

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

export type EntityMapperOptions = Pick<
    JoinAndSelectExposedPropsOptions,
    "defaultMaxDepthLvl" | "isMaxDepthEnabledByDefault"
>;
export type EntityMapperMakeOptions = EntityMapperOptions & {
    pretty?: boolean;
};
