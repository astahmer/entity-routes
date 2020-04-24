import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { EntityMetadata } from "typeorm";
import { entityRoutesContainer } from "@/container";
import { getRouteMetadata } from "@/services/EntityRoute";

export const iriRegex = new RegExp(/\/api\/(\w+)\//g, "i");
export function formatIriToId<B extends Boolean>(iri: string, asInt?: B): B extends true ? number : string;
export function formatIriToId(iri: string, asInt?: boolean) {
    return asInt ? parseInt(iri.replace(iriRegex, "")) : iri.replace(iriRegex, "");
}

export const getEntrypointFromIri = (iri: string) => iri.match(iriRegex)[1];
export const isIriValidForProperty = (iri: string, column: ColumnMetadata) => {
    if (!iri.startsWith("/api/") || !column.relationMetadata) return;

    const tableName = column.relationMetadata.inverseEntityMetadata.tableName + "s";
    const entrypoint = getEntrypointFromIri(iri);
    const sameAsRouteName =
        entityRoutesContainer[tableName] && entrypoint === entityRoutesContainer[tableName].routeMetadata.path;
    const sameAsTableName = entrypoint === tableName;

    return sameAsRouteName || sameAsTableName;
};

export function idToIRI(entityMeta: EntityMetadata, id: number) {
    const routeMetadata = getRouteMetadata(entityMeta.target as Function);
    return routeMetadata && "/api" + routeMetadata.path + "/" + id;
}
