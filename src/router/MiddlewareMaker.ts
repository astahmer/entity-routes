import { Connection, DeleteResult, QueryRunner, Repository, getConnection } from "typeorm";
import { Container } from "typedi";

import { RouteOperation } from "@/decorators/Groups";
import { GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { EntityErrorResponse } from "@/database/Persistor";
import { SubresourceRelation } from "@/router/SubresourceManager";
import { isType, isDev } from "@/functions/asserts";
import { MappingManager } from "@/mapping/MappingManager";
import { EntityErrorResults } from "@/request/Validator";
import { RouteController } from "@/router/RouteController";
import { QueryParams } from "@/filters/index";
import { ContextAdapter, Middleware } from "@/router/bridge/ContextAdapter";
import { parseStringAsBoolean } from "@/functions/primitives";
import { DeepPartial, FunctionKeys, ObjectLiteral, Unpacked } from "@/utils-types";
import { ContextWithState, addRequestContext, removeRequestContext } from "@/request";

export class MiddlewareMaker<Entity extends GenericEntity> {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get metadata() {
        return this.repository.metadata;
    }

    private connection: Connection;
    private controller: RouteController<Entity>;

    constructor(private repository: Repository<Entity>, private options: EntityRouteOptions = {}) {
        this.connection = getConnection();
        this.controller = new RouteController(repository, options);
    }

    public makeRequestContextMiddleware(
        operation: RouteOperation,
        subresourceRelations?: SubresourceRelation[]
    ): Middleware {
        return async (ctx, next) => {
            addRequestContext(ctx as ContextWithState);

            if (subresourceRelations?.length) {
                subresourceRelations[0].id = parseInt(ctx.params[subresourceRelations[0].param]);
            }

            const { requestId } = ctx.state;
            const requestContext: RequestContext<Entity> = {
                requestId,
                ctx,
                operation,
                isUpdateOrCreate: ctx.requestBody && (ctx.method === "POST" || ctx.method === "PUT"),
                queryParams: ctx.query || {},
                subresourceRelations,
            };

            if (ctx.params.id) requestContext.entityId = parseInt(ctx.params.id);
            if (requestContext.isUpdateOrCreate) requestContext.values = ctx.requestBody;

            // Create query runner to retrieve requestContext in subscribers
            const queryRunner = this.connection.createQueryRunner();
            queryRunner.data = { requestContext };

            ctx.state.requestContext = requestContext;
            ctx.state.queryRunner = queryRunner;

            await this.options.hooks?.beforeHandle?.(ctx as ContextWithState);

            return next();
        };
    }

    /** Returns the response method on a given operation for this entity */
    public makeResponseMiddleware(operation: string): Middleware {
        return async (ctx, next) => {
            const { requestContext = {} as RequestContext<Entity>, requestId } = ctx.state as RequestState<Entity>;

            const method = CRUD_ACTIONS[operation].method;
            let response: RouteResponse = {
                "@context": {
                    operation,
                    entity: this.metadata.tableName,
                },
            };
            if (requestContext.isUpdateOrCreate) response["@context"].validationErrors = null;

            let result;
            try {
                result = await this.controller[method]({ requestId, operation, ...requestContext });

                if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
                    response["@context"].validationErrors = result.errors;
                    ctx.status = 400;
                } else if ("error" in result) {
                    response["@context"].error = result.error;
                    ctx.status = 400;
                }

                if (isType<CollectionResult<Entity>>(result, operation === "list")) {
                    response["@context"].retrievedItems = result.items.length;
                    response["@context"].totalItems = result.totalItems;
                    response.items = result.items;
                } else if (isType<DeleteResult>(result, "raw" in result)) {
                    response.deleted = result.affected ? requestContext.entityId : null;
                } else {
                    response = { ...response, ...result };
                }
            } catch (error) {
                response["@context"].error = isDev() ? error.message : "Bad request";
                isDev() && console.error(error);
                ctx.status = 400;
            }

            const ref = { ctx: ctx as ContextWithState, response, result };
            await this.options.hooks?.beforeRespond?.(ref);

            ctx.status = 200;
            ctx.responseBody = ref.response;

            await this.options.hooks?.afterRespond?.(ref);
            next();
        };
    }

    public makeEndResponseMiddleware(): Middleware {
        return async (ctx) => {
            if (!ctx.state.queryRunner.isReleased) {
                await ctx.state.queryRunner.release();
            }

            await this.options.hooks?.afterHandle?.(ctx as ContextWithState);

            removeRequestContext(ctx.state.requestId);
        };
    }

    /** Returns the method of a mapping route on a given operation for this entity */
    public makeRouteMappingMiddleware(operation: RouteOperation): Middleware {
        return async (ctx) => {
            const pretty = parseStringAsBoolean(ctx.query.pretty as string);
            ctx.status = 200;
            ctx.responseBody = {
                context: {
                    operation: operation + ".mapping",
                    entity: this.metadata.tableName,
                },
                routeMapping: this.mappingManager.make(this.metadata, operation, { ...this.options, pretty }),
            };
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
    restore: { path: "/:id(\\d+)/restore", verb: "put", method: "restore" },
};

export type CrudAction = {
    /** The route path for this action */
    path: string;
    /** HTTP verb for this action */
    verb: RouteVerb;
    /** RouteController method's name associated to this action */
    method?: FunctionKeys<RouteController<any>>;
};

/** EntityRoute request context wrapping Koa's Context */
export type RequestContext<Entity extends GenericEntity = GenericEntity, QP = QueryParams, State = ObjectLiteral> = {
    /** Current request id */
    requestId?: string;
    /** Request context adapter */
    ctx?: ContextAdapter<QP, State>;
    /** Current route entity id */
    entityId?: string | number;
    /** Parent subresource relations, used to auto-join on this entity's relation inverse side */
    subresourceRelations?: SubresourceRelation[];
    /** Is update or create operation ? To check if there is a body sent */
    isUpdateOrCreate?: boolean;
    /** Request body values sent */
    values?: DeepPartial<Entity>;
    /** Request query params */
    queryParams?: QP;
    /** Custom operation for a custom action */
    operation?: RouteOperation;
};
export type RequestContextMinimal<Entity extends GenericEntity = GenericEntity> = Pick<
    RequestContext<Entity>,
    "requestId" | "operation" | "values"
>;

/** Custom state to pass to Koa's Context */
export type RequestState<Entity extends GenericEntity = GenericEntity> = {
    requestId: string;
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
        validationErrors?: EntityErrorResults;
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

export type RouteControllerResult = Unpacked<ReturnType<RouteController<GenericEntity>[CrudAction["method"]]>>;
