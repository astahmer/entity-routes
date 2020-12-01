import {
    ENTITY_META_SYMBOL,
    MappingItem,
    MappingManager,
    deepMerge,
    fromEntries,
    getEntityRouters,
    last,
    sortObjectByKeys,
} from "@entity-routes/core";
import {
    ComponentsObject,
    OpenAPIObject,
    OpenApiBuilder,
    OperationObject,
    ParameterObject,
    PathItemObject,
    PathsObject,
    SchemaObject,
} from "openapi3-ts";
import { Container } from "typedi";

import { addComponentsReferences } from "./baseReferences";
import {
    getBaseRouteResponseSchemaByType,
    getOpenApiPath,
    makeResponseFromSchema,
    makeResponseWithRef,
    routeResponseTypeByOperation,
    typeOrmTypeToOpenApiType,
} from "./helpers";

const info = { title: "title", description: "entity-routes OpenAPI spec", version: "1.0.0" };

export const makeOpenApiBuilderFrom = (obj: OpenAPIObject) =>
    addComponentsReferences(OpenApiBuilder.create(deepMerge({}, OpenApiBuilder.create().rootDoc, obj)));
export function makeOpenApi(): OpenAPIObject {
    const mappingManager = Container.get(MappingManager);
    const entityRoutes = getEntityRouters();
    const entries = Object.entries(entityRoutes);
    const paths: PathsObject = {};

    // Get all entity parameters such as UserId, ArticleId, CommentId, etc.
    const params = new Set<string>();
    entries.forEach(([_, entityRouter]) =>
        entityRouter.router.routes.forEach((bridgeRoute) => {
            bridgeRoute.subresources?.forEach((subresource) => subresource.param && params.add(subresource.param));
        })
    );
    // And make references from them
    const entityIdParameters: ParameterObject[] = [...params].map((param) => ({
        name: param,
        in: "path",
        required: true,
        schema: { type: "integer" },
    }));
    const parameters: ComponentsObject["parameters"] = {};
    entityIdParameters.forEach((param) => (parameters[param.name] = param));

    entries.forEach(([_, entityRouter]) => {
        entityRouter.router.routes.forEach((bridgeRoute) => {
            const path = getOpenApiPath(bridgeRoute.path);
            const routeResponseType = routeResponseTypeByOperation[bridgeRoute.operation];
            const schemaByOperation = getBaseRouteResponseSchemaByType(routeResponseType || "item");

            // Add both subresource & entity parameters
            const parameters: OperationObject["parameters"] = (bridgeRoute.subresources || [])
                .map(
                    (subresource) =>
                        entityIdParameters.find((param) => param.name === subresource.param) && {
                            $ref: "#/components/parameters/" + subresource.param,
                        }
                )
                .filter(Boolean)
                .concat(path.includes("{id}") ? [{ $ref: "#/components/parameters/EntityId" }] : []);

            const entityMeta = bridgeRoute.subresources?.length
                ? last(bridgeRoute.subresources).relation.inverseEntityMetadata
                : entityRouter["repository"].metadata;
            const mapping = mappingManager.make(entityMeta, bridgeRoute.operation);
            const responseSchema = makeResponseSchemaFromMapping(mapping);

            const okResponse =
                bridgeRoute.operation === "delete"
                    ? makeResponseWithRef(schemaByOperation)
                    : makeResponseFromSchema(responseSchema);
            const operationObj: OperationObject = {
                description: bridgeRoute.name,
                responses: {
                    200: okResponse,
                    500: makeResponseWithRef("BaseErrorRouteResponseSchema"),
                },
            };

            const pathItem: PathItemObject = paths[path] || {};
            const method = bridgeRoute.methods[0];
            pathItem[method] = operationObj;
            pathItem.parameters = parameters;

            if (!paths[path]) paths[path] = pathItem;
        });
    });

    return { openapi: "3.0.0", info, paths, components: { parameters } };
}

function makeResponseSchemaFromMapping(rootMapping: MappingItem): SchemaObject {
    const columns = rootMapping.selectProps.map((name) =>
        rootMapping[ENTITY_META_SYMBOL].columns.find((col) => col.propertyName === name)
    );
    const relationsMeta = rootMapping.relationProps.map((name) =>
        rootMapping[ENTITY_META_SYMBOL].relations.find((rel) => rel.propertyName === name)
    );

    const primitives = fromEntries(
        columns.map((col) => [col.propertyName, { type: typeOrmTypeToOpenApiType(col.type) }])
    );
    const relations = fromEntries(
        relationsMeta.map((rel) => [
            rel.propertyName,
            makeResponseSchemaFromMapping(rootMapping.mapping[rel.propertyName]),
        ])
    );

    const properties: SchemaObject["properties"] = sortObjectByKeys({ ...primitives, ...relations });
    const schema: SchemaObject = { properties };

    return schema;
}
