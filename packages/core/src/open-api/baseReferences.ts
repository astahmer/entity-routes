import { OpenApiBuilder } from "openapi3-ts";

import { makeResponseWithRef } from "./helpers";

/** Add ts types as OpenAPI references (responses, schema, etc) */
export function addComponentsReferences(builder: OpenApiBuilder) {
    // Responses using schemas defined below
    builder.addResponse("BaseRouteResponse", makeResponseWithRef("BaseRouteResponseSchema"));
    builder.addResponse("ErrorRouteResponse", makeResponseWithRef("BaseErrorRouteResponseSchema", "Response error."));

    // Parameters
    builder.addParameter("EntityId", {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer" },
        description: "Current entity route id",
    });
    // TODO PaginationFilter/OrderFilter
    // TODO Mapping.pretty

    // Schemas
    // @context
    builder.addSchema("BaseRouteContext", {
        type: "object",
        required: ["entity", "operation"],
        properties: { entity: { type: "string" }, operation: { type: "string" } },
    });
    builder.addSchema("CollectionRouteContext", {
        allOf: [{ $ref: "#/components/schemas/BaseRouteContext" }],
        type: "object",
        required: ["retrievedItems"],
        properties: { totalItems: { type: "integer" }, retrievedItems: { type: "integer" } },
    });
    builder.addSchema("PersistRouteContext", {
        allOf: [{ $ref: "#/components/schemas/BaseRouteContext" }],
        type: "object",
        required: ["validationErrors"],
        properties: { validationErrors: { $ref: "#/components/schemas/EntityErrorResults" } },
    });
    builder.addSchema("ErrorRouteContext", {
        allOf: [{ $ref: "#/components/schemas/BaseRouteContext" }],
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
    });
    // @context.validationErrors
    builder.addSchema("EntityErrorResults", {
        type: "object",
        additionalProperties: { type: "array", items: { $ref: "#/components/schemas/EntityError" } },
    });
    builder.addSchema("EntityError", {
        type: "object",
        properties: {
            currentPath: { type: "string" },
            property: { type: "string" },
            constraints: { additionalProperties: { type: "string" } },
        },
    });
    // RouteResponse
    builder.addSchema("BaseRouteResponseSchema", {
        type: "object",
        required: ["@context"],
        properties: { "@context": { $ref: "#/components/schemas/BaseRouteContext" } },
    });
    builder.addSchema("BaseItemRouteResponseSchema", {
        type: "object",
        allOf: [{ $ref: "#/components/schemas/BaseRouteResponseSchema" }],
    });
    builder.addSchema("BaseCollectionRouteResponseSchema", {
        type: "object",
        properties: { "@context": { $ref: "#/components/schemas/CollectionRouteContext" } },
    });
    builder.addSchema("BasePersistRouteResponseSchema", {
        type: "object",
        properties: { "@context": { $ref: "#/components/schemas/PersistRouteContext" } },
    });
    builder.addSchema("BaseErrorRouteResponseSchema", {
        type: "object",
        properties: { "@context": { $ref: "#/components/schemas/ErrorRouteContext" } },
    });
    builder.addSchema("BaseDeleteRouteResponseSchema", {
        type: "object",
        allOf: [{ $ref: "#/components/schemas/BaseRouteResponseSchema" }],
        properties: { deleted: { title: "TypeORM.DeleteResult" } },
    });

    return builder;
}
