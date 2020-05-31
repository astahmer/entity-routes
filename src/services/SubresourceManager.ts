import { Repository } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

import { getEntityRouters } from "@/router/container";
import { CRUD_ACTIONS } from "./ResponseManager";
import { getRouteSubresourcesMetadata, RouteMetadata, GenericEntity } from "../router/EntityRouter";
import { BridgeRouter } from "@/bridges/routers/BridgeRouter";

export class SubresourceManager<Entity extends GenericEntity> {
    private subresourcesMeta: RouteSubresourcesMeta<Entity>;

    constructor(private repository: Repository<Entity>, private routeMetadata: RouteMetadata) {
        this.subresourcesMeta = getRouteSubresourcesMetadata(repository.metadata.target as Function);
    }

    get metadata() {
        return this.repository.metadata;
    }

    /** Recursively add subresources routes for this entity */
    public makeSubresourcesRoutes(
        router: BridgeRouter,
        nestedPath?: { current: string[]; parent: string; maxDepths?: number[] }
    ) {
        if (!Object.keys(this.subresourcesMeta.properties).length) {
            return;
        }

        const entityRouters = getEntityRouters();

        // For each subresources of this entity
        for (let key in this.subresourcesMeta.properties) {
            const subresourceProp = this.subresourcesMeta.properties[key];
            const subresourceRelation = this.getSubresourceRelation(key);
            const subresourcePath = this.getSubresourceBasePath(
                subresourceRelation.param,
                subresourceProp,
                nestedPath && nestedPath.parent
            );

            const relationTableName = subresourceRelation.relation.inverseEntityMetadata.tableName;
            const nestedEntityRoute = entityRouters[subresourceProp.entityTarget.name];

            // If subresource entity has no EntityRoute, then it can't make a subresource out of it
            if (!nestedEntityRoute) {
                continue;
            }

            // Add one to also count root subresource
            const currentDepth = 1 + (nestedPath ? nestedPath.current.length : 0);

            // Checks for every max depth of every subresources including this one
            const hasReachedMaxDepth = nestedPath
                ? nestedPath.maxDepths.some((maxDepth) => currentDepth >= maxDepth)
                : currentDepth >= subresourceProp.maxDepth;

            const isSubresourceCircular = nestedPath && nestedPath.current.includes(relationTableName);

            // Ensures that it is not making circular subresources routes & that maxDepth isn't reached
            if (!hasReachedMaxDepth && !isSubresourceCircular) {
                // Recursively make subresources
                nestedEntityRoute.subresourceManager.makeSubresourcesRoutes(router, {
                    parent: subresourcePath,
                    current: nestedPath ? nestedPath.current.concat(relationTableName) : [relationTableName],
                    maxDepths: nestedPath ? nestedPath.maxDepths.concat(currentDepth) : [currentDepth],
                });
            }

            const isSubresourceSingle =
                subresourceRelation.relation.isOneToOne || subresourceRelation.relation.isManyToOne;

            // Generates details endpoint at subresourcePath
            if (isSubresourceSingle && subresourceProp.operations.includes("details")) {
                subresourceProp.operations.forEach((operation) => {
                    const requestContextMw = nestedEntityRoute.responseManager.makeRequestContextMiddleware(
                        operation,
                        subresourceRelation
                    );
                    const responseMw = nestedEntityRoute.responseManager.makeResponseMiddleware(operation);

                    router.register({
                        path: subresourcePath,
                        methods: [CRUD_ACTIONS[operation].verb],
                        middlewares: [requestContextMw, responseMw],
                    });
                });

                continue;
            }

            // Generates endpoint at subresourcePath for each operation
            subresourceProp.operations.forEach((operation) => {
                const requestContextMw = nestedEntityRoute.responseManager.makeRequestContextMiddleware(
                    operation,
                    subresourceRelation
                );
                const responseMw = nestedEntityRoute.responseManager.makeResponseMiddleware(operation);

                const path = subresourcePath + CRUD_ACTIONS[operation].path;
                router.register({
                    path,
                    methods: [CRUD_ACTIONS[operation].verb],
                    middlewares: [requestContextMw, responseMw],
                });
            });
        }
    }

    /** Retrieve informations on a subresource relation */
    private getSubresourceRelation(key: string) {
        const parentDetailsParam = ((this.subresourcesMeta.parent as any) as Function).name + "Id";
        const relationMeta = this.metadata.findRelationWithPropertyPath(key);
        return {
            param: parentDetailsParam,
            propertyName: key,
            relation: relationMeta,
        };
    }

    /** Returns a (nested?) subresource base path (= without operation suffix)  */
    private getSubresourceBasePath(param: string, subresourceProp: SubresourceProperty<any>, parentPath?: string) {
        const parentDetailsPath = CRUD_ACTIONS.details.path.replace(":id", ":" + param);
        return (parentPath || this.routeMetadata.path) + parentDetailsPath + "/" + subresourceProp.path;
    }
}

export type SubresourceOperation = "create" | "list" | "details" | "delete";
export type SubresourceProperty<Entity extends GenericEntity> = {
    /** The route path for this action */
    path: string;
    /** List of operations to create a subresource route for */
    operations: SubresourceOperation[];
    /** Subresource entity, used to retrieve its EntityRoute */
    entityTarget: Entity;
    /** Max depth of a subresource property : Limit the number of times a subresource can have another */
    maxDepth: number;
};
export type RouteSubresourcesMeta<ParentEntity extends GenericEntity> = {
    parent: ParentEntity;
    properties: Record<string, SubresourceProperty<any>>;
};
/** Subresource relation with parent, used to auto-join on this entity's relation inverse side */
export type SubresourceRelation = {
    /** Subresource parent's entity id */
    id?: number;
    /** Route path parameter key, for example "userId" where the route path is "/users/:userId" */
    param: string;
    /** Subresource parent relation property name */
    propertyName: string;
    /** Subresource parent relationMeta */
    relation: RelationMetadata;
};
