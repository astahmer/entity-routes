import { Repository, EntityMetadata } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

import { getEntityRouters } from "@/router/container";
import {
    getRouteSubresourcesMetadata,
    RouteMetadata,
    GenericEntity,
    EntityRouterOptions,
} from "../router/EntityRouter";
import { BridgeRouter } from "@/router/bridge/BridgeRouter";
import { CRUD_ACTIONS } from "@/router/MiddlewareMaker";
import { formatRoutePath, formatRouteName } from "@/functions/route";
import { ObjectOrCollectionKeys } from "@/utils-types";
import { prop } from "@/functions/object";
import { last } from "@/functions/array";
import { isRelationSingle } from "@/functions/entity";

export class SubresourceMaker<Entity extends GenericEntity> {
    private subresourcesMeta: RouteSubresourcesMeta<Entity>;

    constructor(
        private repository: Repository<Entity>,
        private routeMetadata: RouteMetadata,
        private options: SubresourceMakerOptions = { middlewareAdapter: undefined }
    ) {
        this.subresourcesMeta = getRouteSubresourcesMetadata(repository.metadata.target as Function);
    }

    get metadata() {
        return this.repository.metadata;
    }

    get mwAdapter() {
        return this.options.middlewareAdapter;
    }

    /** Recursively add subresources routes for this entity */
    public makeSubresourcesRoutes(router: BridgeRouter, parents?: ParentSubresources) {
        if (!Object.keys(this.subresourcesMeta.properties).length) {
            return;
        }

        const entityRouters = getEntityRouters();

        // For each subresources of this entity
        for (let key in this.subresourcesMeta.properties) {
            const subresourceProp = this.subresourcesMeta.properties[key];
            if (parents && !subresourceProp.canBeNested) continue;

            const nestedEntityRoute = entityRouters[subresourceProp.entityTarget.name];

            // If subresource entity has no EntityRoute, then it can't make a subresource out of it
            if (!nestedEntityRoute) continue;

            const subresourceRelation = this.getSubresourceRelation(key);
            const relationTableName = subresourceRelation.relation.inverseEntityMetadata.tableName;
            const isCircular = parents?.entities.includes(relationTableName);

            // Ensures that it is not making circular subresources routes
            if (isCircular) continue;

            // Add one to also count root subresource
            const currentDepth = 1 + (parents ? parents.entities.length : 0);

            // Checks for every max depth of every subresources including this one
            const currentMaxDepth = subresourceProp.maxDepth || this.options.defaultSubresourceMaxDepthLvl;
            const maxDepths = (parents?.maxDepths || []).concat(currentMaxDepth);
            const hasReachedMaxDepth = maxDepths.some((maxDepth) => currentDepth > maxDepth);

            if (hasReachedMaxDepth) continue;

            const basePath = this.getSubresourceBasePath(subresourceRelation.param, subresourceProp, parents?.path);
            const chainedPath = parents && parents.path + "/" + formatRoutePath(subresourceProp.path);

            const subresourceRelations = (parents?.subresourceRelations || []).concat(subresourceRelation);
            const entities = (parents?.entities || []).concat(relationTableName);

            // When subresource is nested, remove current subresourceRelation param from the list
            const relations = parents
                ? subresourceRelations.slice(0, -1).concat({ ...subresourceRelation, param: null })
                : subresourceRelations;

            const baseContextName = relations[0].relation.entityMetadata.tableName;
            const chainedSubresourceNames = relations.map(prop("propertyName")).join("_");
            const baseRouteName = formatRouteName(baseContextName + "_" + chainedSubresourceNames, "");

            const isSingle = isRelationSingle(subresourceRelation.relation);
            const previousRelation = last(parents?.subresourceRelations || []);
            const isPreviousMultiple = previousRelation && !isRelationSingle(previousRelation.relation);

            // Skip details operation if chaining on a list subresource relation
            // ex: /user/123/comments/article should NOT be possible since we can't know from which Comment the article belongs to
            if (isPreviousMultiple && isSingle) continue;

            // Nested operations can only be read operations (list, details)
            const operations = !parents
                ? subresourceProp.operations
                : subresourceProp.operations.filter((op) => nestedSubresourceOperations.includes(op));
            // Generates endpoint for each operation
            operations.forEach((operation) => {
                // Skip list operation on XToOne & details operation on XToMany
                if (isSingle ? operation === "list" : operation === "details") return;

                const requestContextMw = nestedEntityRoute.middlewareMaker.makeRequestContextMiddleware(
                    operation,
                    relations
                );
                const responseMw = nestedEntityRoute.middlewareMaker.makeResponseMiddleware(operation);

                const path = !parents
                    ? this.getSubresourcePathForOperation({ basePath, operation, isSingle })
                    : chainedPath;

                const name = baseRouteName + operation;

                router.register({
                    path,
                    name,
                    methods: [CRUD_ACTIONS[operation].verb],
                    middlewares: [requestContextMw, responseMw].map(this.mwAdapter),
                });
            });

            const path = !parents ? basePath : chainedPath;
            const updatedParents: ParentSubresources = { path, entities, maxDepths, subresourceRelations: relations };

            // Recursively make subresources
            if (subresourceProp.canHaveNested) {
                nestedEntityRoute.subresourceMaker.makeSubresourcesRoutes(router, updatedParents);
            }
        }
    }

    /** Retrieve informations on a subresource relation */
    private getSubresourceRelation(key: string) {
        return getSubresourceRelation(this.subresourcesMeta.parent as any, this.metadata, key);
    }

    /** Returns a (nested?) subresource base path (= without operation suffix)  */
    private getSubresourceBasePath(param: string, subresourceProp: SubresourceProperty, parentPath?: string) {
        const parentDetailsPath = CRUD_ACTIONS.details.path.replace(":id", ":" + param);
        return (
            (parentPath || this.routeMetadata.path) + parentDetailsPath + "/" + formatRoutePath(subresourceProp.path)
        );
    }

    /** Returns a subresource path (=base+operation)  */
    private getSubresourcePathForOperation({ basePath, operation, isSingle }: GetSubresourcePathArg) {
        // Single subresource operations should be directly on subresourcePath rather than adding a "/:id"
        // ex: /user/:userId/role instead of /user/:userId/role/:roleId
        const operationSuffix =
            isSingle && singleSubresourceOperations.includes(operation) ? "" : CRUD_ACTIONS[operation].path;

        return basePath + operationSuffix;
    }
}

type ParentSubresources = {
    entities: string[];
    path: string;
    maxDepths?: number[];
    subresourceRelations: SubresourceRelation[];
};

type GetSubresourcePathArg = {
    basePath: string;
    operation: SubresourceOperation;
    isSingle: boolean;
};

export type SubresourceMakerOptions = Pick<EntityRouterOptions, "middlewareAdapter" | "defaultSubresourceMaxDepthLvl">;

export function getSubresourceRelation<E extends Function>(
    parent: E,
    parentEntityMetadata: EntityMetadata,
    propertyName: ObjectOrCollectionKeys<E extends new (...args: any) => any ? InstanceType<E> : never>
): SubresourceRelation {
    const parentDetailsParam = (parent as Function).name + "Id";
    const relationMeta = parentEntityMetadata.findRelationWithPropertyPath(propertyName as string);
    return {
        param: parentDetailsParam,
        propertyName: propertyName as string,
        relation: relationMeta,
    };
}

export const singleSubresourceOperations = ["details", "delete"];
export const nestedSubresourceOperations = ["list", "details"];

export type SubresourceOperation = "create" | "list" | "details" | "delete";
export type SubresourceProperty<Entity extends GenericEntity = any> = {
    /** The route path for this action */
    path: string;
    /** List of operations to create a subresource route for */
    operations: SubresourceOperation[];
    /** Subresource entity, used to retrieve its EntityRoute */
    entityTarget: Entity;
    /** Max depth of a subresource property : Limit the number of times a subresource can have another */
    maxDepth: number;
    /**
     * Allow this subresource to be chained after other subresources
     * @example
     * <User> has a subresource <articles: Article[]>, which itself has a subresource <comments: Comment[]>
     * Among others, the User.articles endpoint is generated : /user/123/articles/comments
     *
     * On the subresourceProperty = { ..., entityTarget: Comment, path: comments }
     * if subresourceProperty.canBeNested = true :
     *     Then the endpoint /user/123/articles/comments will be generated (if <articles> subresource allows it with canHaveNested=true)
     * else only the /article/456/comments will be generated since it is shallow
     */
    canBeNested: boolean;
    /**
     * Allow other subresources to be chained after this subresource
     * @example
     * <User> has a subresource <articles: Article[]>, which itself has a subresource <comments: Comment[]>
     * Among others, the User.articles endpoint is generated : /user/123/articles/comments
     *
     * On the subresourceProperty = { ..., entityTarget: Article, path: articles }
     * if subresourceProperty.canHaveNested = true :
     *     Then the endpoint /user/123/articles/comments will be generated (if <comments> subresource allows it with canBeNested=true)
     * else only the /user/123/articles will be generated since it is shallow
     */
    canHaveNested: boolean;
};
export type RouteSubresourcesMeta<ParentEntity extends GenericEntity> = {
    parent: ParentEntity;
    properties: Record<string, SubresourceProperty>;
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
