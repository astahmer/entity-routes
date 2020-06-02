import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { EntityMetadata } from "typeorm";
import { getRouteMetadata } from "@/router/EntityRouter";
import { getEntityRouters } from "@/router/container";

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

export function idToIRI(entityMeta: EntityMetadata, id: number, options?: IdToIRIOptions) {
    const routeMetadata = getRouteMetadata(entityMeta.target as Function);
    if (!routeMetadata || options?.useClassNameAsEntrypoint) {
        return `/api/${entityMeta.tableName}/${id}`;
    } else {
        return `/api/${routeMetadata.path}/${id}`;
    }
}

export type IdToIRIOptions = { useClassNameAsEntrypoint: boolean };
