import { CType, GenericEntity, Props, formatRoutePath, getEntityRouters, getRouteMetadata } from "@entity-routes/core";
import { EntityMetadata } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export const iriRegex = new RegExp(/\/api\/(\w+)\//g, "i");
export function formatIriToId<B extends Boolean>(iri: string, asInt?: B): B extends true ? number : string;
export function formatIriToId(iri: string | number, asInt?: boolean) {
    if (typeof iri === "number") return iri;
    return asInt ? parseInt(iri.replace(iriRegex, "")) : iri.replace(iriRegex, "");
}

export const getEntrypointFromIri = (iri: string) => iri.match(iriRegex)[1];
export const isIriValidForProperty = (iri: string, column: ColumnMetadata) => {
    if (!iri.startsWith("/api/") || !column) return;

    const entityRouters = getEntityRouters();
    const tableName = column.relationMetadata
        ? column.relationMetadata.inverseEntityMetadata.tableName
        : column.entityMetadata.tableName;
    const entrypoint = getEntrypointFromIri(iri);
    const sameAsRouteName = entityRouters[tableName] && entrypoint === entityRouters[tableName].routeMetadata.path;
    const sameAsTableName = entrypoint === tableName;

    return sameAsRouteName || sameAsTableName;
};

export type IdToIRIOptions = { useClassNameAsEntrypoint: boolean };
export function idToIRI(entityMeta: EntityMetadata, id: string | number, options?: IdToIRIOptions) {
    const routeMetadata = getRouteMetadata(entityMeta.target as Function);
    if (!routeMetadata || options?.useClassNameAsEntrypoint) {
        return `/api/${entityMeta.tableName}/${id}`;
    } else {
        return `/api/${formatRoutePath(routeMetadata.path)}/${id}`;
    }
}

export const isRelationSingle = (relation: RelationMetadata) => relation.isOneToOne || relation.isManyToOne;

export const makeEntityFromEntries = <Entity extends GenericEntity = GenericEntity>(
    entity: CType<Entity>,
    entries: [keyof Entity, Entity[keyof Entity]][]
) => {
    const item = new entity();
    entries.forEach(([key, value]) => (item[key] = value));
    return item;
};
export const makeEntity = <Entity extends GenericEntity = GenericEntity>(
    entity: CType<Entity>,
    record: Partial<{ [Key in Props<Entity>]: Entity[Key] }>
) => {
    const item = new entity();
    const entries = Object.entries(record);
    entries.forEach(([key, value]) => (item[key as keyof Entity] = value as Entity[keyof Entity]));
    return item;
};
