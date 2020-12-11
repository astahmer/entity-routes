import { SchemaObject } from "openapi3-ts";
import { ColumnType } from "typeorm";

import { upperFirstLetter } from "@entity-routes/shared";

import { RouteOperation } from "../decorators";
import { RouteResponseType } from "../router";

const idParamType = "(\\d+)";

/** Replace all :entityId(\\d+) by {entityId} */
export const getOpenApiPath = (path: string) =>
    path.split(idParamType).join("").split(":").join("{").split("{id").join("{id}").split("d/").join("d}/");

export const routeResponseTypeByOperation: Record<RouteOperation, RouteResponseType> = {
    create: "persist",
    update: "persist",
    list: "collection",
    details: "item",
    delete: "delete",
};
export const getBaseRouteResponseSchemaByType = (type: RouteResponseType) =>
    `Base${upperFirstLetter(type)}RouteResponseSchema`;

export type OpenApiPrimitive = Extract<SchemaObject["type"], "integer" | "number" | "string" | "boolean">;
/**
 * Associations of TypeORM.ColumnType with OpenAPI.DataType
 * @see https://github.com/typeorm/typeorm/blob/master/docs/entities.md#column-types-for-mysql--mariadb
 * @see https://github.com/typeorm/typeorm/blob/master/src/driver/types/ColumnTypes.ts
 */
export const openApiSchemaTypeByColumnType: Partial<Record<Extract<ColumnType, string>, OpenApiPrimitive>> = {
    //
    number: "number",
    float: "number",
    //
    int: "integer",
    integer: "integer",
    //
    bool: "boolean",
    boolean: "boolean",
    //
    date: "string",
    datetime: "string",
    time: "string",
    timestamp: "string",
    //
    varchar: "string",
    text: "string",
    string: "string",
};
/** Get OpenAPI SchemObject.type by TypeORM.ColumnType, if no direct association -> defaults to string */
export const typeOrmTypeToOpenApiType = (type: ColumnType) =>
    (typeof type === "string"
        ? openApiSchemaTypeByColumnType[type]
        : openApiSchemaTypeByColumnType[type.name as keyof typeof openApiSchemaTypeByColumnType]) || "string";

export const makeResponseFromSchema = (schema: SchemaObject, description = "OK") => ({
    description,
    content: { "application/json": { schema } },
});
export const makeResponseWithRef = (ref: string, description: string = "OK") =>
    makeResponseFromSchema({ $ref: `#/components/schemas/${ref}` }, description);
