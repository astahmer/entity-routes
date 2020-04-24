import { getRouteSubresourcesMetadata, ROUTE_SUBRESOURCES } from "@/services/EntityRoute";
import { RouteSubresourcesMeta, SubresourceOperation } from "@/services/SubresourceManager";
import { EntityReference } from "@/utils-types";

export function Subresource(
    entityTarget: Promise<EntityReference> | EntityReference,
    options?: SubresourceOptions
): PropertyDecorator {
    return (target: Object, propName: string) => {
        // Wrap it in a promise to avoid circular-dependency problems where entityTarget would be undefined
        Promise.resolve(entityTarget).then((entityType) => {
            const subresourcesMeta: RouteSubresourcesMeta<any> = getRouteSubresourcesMetadata(target.constructor);

            // Merge default options with decorator parameter
            options = {
                operations: ["create", "list", "details", "delete"],
                ...options,
            };

            subresourcesMeta.properties[propName] = {
                path: options.path || propName,
                operations: options.operations,
                entityTarget: entityType(),
                maxDepth: options.maxDepth,
            };

            Reflect.defineMetadata(ROUTE_SUBRESOURCES, subresourcesMeta, target.constructor);
        });
    };
}

type SubresourceOptions = {
    path?: string;
    operations?: SubresourceOperation[];
    maxDepth?: number;
};
