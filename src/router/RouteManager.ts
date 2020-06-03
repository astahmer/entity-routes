import { Connection, DeleteResult, QueryRunner, Repository } from "typeorm";
import { Container } from "typedi";

import { RouteOperation } from "@/decorators/Groups";
import { GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { EntityErrorResponse } from "@/serializer/Denormalizer";
import { SubresourceRelation } from "@/router/SubresourceManager";
import { isType, isDev } from "@/functions/asserts";
import { MappingManager } from "@/mapping/MappingManager";
import { EntityErrorResults } from "@/serializer/Validator";
import { Context } from "@/utils-types";
import { Middleware } from "koa"; // TODO use Middleware from/util-types = wrap ctx since ctx.params/body.state do not exist for Express
import { RouteController } from "@/router/RouteController";

// TODO AuthProvider
export class RouteManager<Entity extends GenericEntity> {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get metadata() {
        return this.repository.metadata;
    }

    private controller: RouteController<Entity>;

    constructor(
        private connection: Connection,
        private repository: Repository<Entity>,
        private options: EntityRouteOptions
    ) {
        this.controller = new RouteController(repository, options);
    }

    public makeRequestContextMiddleware(
        operation: RouteOperation,
        subresourceRelation?: SubresourceRelation
    ): Middleware {
        return async (ctx, next) => {
            if (subresourceRelation) {
                subresourceRelation.id = parseInt(ctx.params[subresourceRelation.param]);
            }

            const params: RequestContext<Entity> = {
                ctx,
                subresourceRelation,
                isUpdateOrCreate: ctx.request.body && (ctx.method === "POST" || ctx.method === "PUT"),
            };

            if (ctx.params.id) params.entityId = parseInt(ctx.params.id);
            if (params.isUpdateOrCreate) params.values = ctx.request.body;
            if (operation === "list") params.queryParams = ctx.query || {};

            // Create query runner to retrieve requestContext in subscribers
            const queryRunner = this.connection.createQueryRunner();
            queryRunner.data = { requestContext: params };

            ctx.state.requestContext = params;
            ctx.state.queryRunner = queryRunner;

            await next();

            if (!ctx.state.queryRunner.isReleased) {
                ctx.state.queryRunner.release();
            }
        };
    }

    /** Returns the response method on a given operation for this entity */
    public makeResponseMiddleware(operation: RouteOperation): Middleware {
        return async (ctx) => {
            const { requestContext: params } = ctx.state as RequestState<Entity>;

            const method = CRUD_ACTIONS[operation].method;
            let response: RouteResponse = {
                "@context": {
                    operation,
                    entity: this.metadata.tableName,
                },
            };
            if (params.isUpdateOrCreate) response["@context"].errors = null;

            try {
                const result = await this.controller[method]({ operation, ...params });

                if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
                    response["@context"].errors = result.errors;
                    ctx.status = 400;
                } else if ("error" in result) {
                    response["@context"].error = result.error;
                    ctx.status = 400;
                } else if (isType<CollectionResult<Entity>>(result, operation === "list")) {
                    response["@context"].retrievedItems = result.items.length;
                    response["@context"].totalItems = result.totalItems;
                    response.items = result.items;
                } else if (isType<DeleteResult>(result, "raw" in result)) {
                    response.deleted = result.affected ? params.entityId : null;
                } else {
                    response = { ...response, ...result };
                }
            } catch (error) {
                response["@context"].error = isDev() ? error.message : "Bad request";
                console.error(error);
                ctx.status = 400;
            }

            ctx.body = response;
        };
    }

    /** Returns the method of a mapping route on a given operation for this entity */
    public makeRouteMappingMiddleware(operation: RouteOperation): Middleware {
        return async (ctx, next) => {
            const pretty = ctx.query.pretty;
            ctx.body = {
                context: {
                    operation: operation + ".mapping",
                    entity: this.metadata.tableName,
                },
                routeMapping: this.mappingManager.make(this.metadata, operation, { ...this.options, pretty }),
            };
            next();
        };
    }
}

export type CrudActions = Omit<Record<RouteOperation | "delete", CrudAction>, "all">;

export type RouteVerb = "get" | "post" | "put" | "delete";
export const CRUD_ACTIONS: CrudActions = {
    create: { path: "", verb: "post", method: "create" },
    list: { path: "", verb: "get", method: "getList" },
    details: { path: "/:id(\\d+)", verb: "get", method: "getDetails" },
    update: { path: "/:id(\\d+)", verb: "put", method: "update" },
    delete: { path: "/:id(\\d+)", verb: "delete", method: "delete" },
};

export type CrudAction = {
    /** The route path for this action */
    path: string;
    /** HTTP verb for this action */
    verb: RouteVerb;
    /** EntityRoute method's name associated to this action or just a function */
    method?: "create" | "getList" | "getDetails" | "update" | "delete";
};

/** EntityRoute request context wrapping Koa's Context */
export type RequestContext<Entity extends GenericEntity = GenericEntity> = {
    /** Koa/Express Request context */
    ctx: Context;
    /** Current route entity id */
    entityId?: string | number;
    /** Subresource relation with parent, used to auto-join on this entity's relation inverse side */
    subresourceRelation?: SubresourceRelation;
    /** Is update or create operation ? To check if there is a body sent */
    isUpdateOrCreate?: boolean;
    /** Request body values sent */
    values?: Partial<Entity>;
    /** Request query params */
    queryParams?: any; // TODO Typings
    /** Custom operation for a custom action */
    operation?: RouteOperation;
};
export type RequestContextMinimal<Entity extends GenericEntity = GenericEntity> = Pick<
    RequestContext<Entity>,
    "operation" | "values"
> &
    Partial<Omit<RequestContext<Entity>, "operation" | "values">>;

/** Custom state to pass to Koa's Context */
export type RequestState<Entity extends GenericEntity = GenericEntity> = {
    requestContext: RequestContext<Entity>;
    queryRunner: QueryRunner;
};

export type RouteResponse = {
    "@context": {
        /** Current route operation */
        operation: string;
        /** Current entity's route */
        entity: string;
        /** Total number of items found for this request */
        totalItems?: number;
        /** Number of items retrieved for this request */
        retrievedItems?: number;
        /** Entity validation errors */
        errors?: EntityErrorResults;
        /** Global response error */
        error?: string;
    };
    /** List of entities */
    items?: any[];
    /** deleted entity id */
    deleted?: any;
    /** Entity props */
    [k: string]: any;
};

/** Return type of EntityRoute.getList */
export type CollectionResult<Entity extends GenericEntity> = {
    items: Entity[];
    totalItems: number;
};
