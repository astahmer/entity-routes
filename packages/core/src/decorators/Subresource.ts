import {
    ROUTE_SUBRESOURCES_METAKEY,
    RouteSubresourcesMeta,
    SubresourceOperation,
    SubresourceProperty,
    getRouteSubresourcesMetadata,
} from "../router";
import { EntityReference } from "../types";

export function Subresource(
    entityTarget: Promise<EntityReference> | EntityReference,
    options: SubresourceOptions = {}
): PropertyDecorator {
    return (target: Object, propName: string) => {
        // Wrap it in a promise to avoid circular-dependency problems where entityTarget would be undefined
        Promise.resolve(entityTarget).then((entityType) => {
            const subresourcesMeta: RouteSubresourcesMeta<any> = getRouteSubresourcesMetadata(target.constructor);
            const operations = options.operations || defaultOperations;
            subresourcesMeta.properties[propName] = {
                path: options.path || propName,
                operations,
                entityTarget: entityType(),
                maxDepth: options.maxDepth,
                canBeNested: options.canBeNested ?? true,
                canHaveNested: options.canHaveNested ?? true,
            };

            Reflect.defineMetadata(ROUTE_SUBRESOURCES_METAKEY, subresourcesMeta, target.constructor);
        });
    };
}

const defaultOperations: SubresourceOperation[] = ["create", "list", "details", "delete"];

export type SubresourceOptions = Partial<Omit<SubresourceProperty, "entityTarget">>;
