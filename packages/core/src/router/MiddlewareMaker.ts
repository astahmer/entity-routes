import { Container } from "typedi";
import { Connection, QueryRunner, Repository, getConnection } from "typeorm";

import {
    DeepPartial,
    FunctionKeys,
    ObjectLiteral,
    Unpacked,
    deepMerge,
    isDev,
    parseStringAsBoolean,
} from "@entity-routes/shared";

import { GroupsDefaultOperation, GroupsOperation, RouteOperation } from "../decorators";
import { QueryParams } from "../filters";
import { MappingManager } from "../mapping";
import { ContextWithState, EntityErrorResults, Handler, makeRequestContext, removeRequestContext } from "../request";
import { Writer } from "../response";
import { GenericEntity } from "../types";
import { ContextAdapter, EntityRouter, Middleware, RouteController, SubresourceRelation } from ".";

export class MiddlewareMaker<Entity extends GenericEntity> {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get metadata() {
        return this.repository.metadata;
    }

    private connection: Connection;
    private handler: Handler<Entity>;
    private writer: Writer<Entity>;

    constructor(private repository: Repository<Entity>, private options: EntityRouter<Entity>["options"] = {}) {
        this.connection = getConnection();
        this.handler = new Handler(repository, options);
        this.writer = new Writer(repository, options);
    }

    /** Attach the requestContext to the ctx.state / queryRunner */
    public makeRequestContextMiddleware(args: MakeRequestContextMwArgs): Middleware {
        return async (ctx: ContextWithState, next) => {
            const requestContext = makeRequestContext<Entity>(args, ctx);

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
    public makeResponseMiddleware(): Middleware {
        return async (ctx: ContextWithState, next) => {
            const operation = ctx.state.requestContext.operation;

            // Override route options with scoped options if any
            const scopedOptions = this.options.scopedOptions?.(operation);
            const options = deepMerge({}, this.options || {}, scopedOptions || {});

            let result, response;
            try {
                result = await this.handler.getResult(ctx, options);
            } catch (error) {
                // On controller unhandled error
                response = this.writer.getBaseResponse(operation);
                (response as RouteResponse<"error">)["@context"].error = isDev() ? error.message : "Bad request";
                isDev() && console.error(error);
            }

            response = await this.writer.makeResponse(ctx, result, options.defaultWriterOptions);

            const ref = { ctx, response, result };
            await this.options.hooks?.beforeRespond?.(ref);

            ctx.status = "error" in response["@context"] ? 500 : 200;
            ctx.responseBody = ref.response;

            await this.options.hooks?.afterRespond?.(ref);
            return next();
        };
    }

    /** Release queryRunner / remove requestContext from store */
    public makeEndResponseMiddleware(): Middleware {
        return async (ctx: ContextWithState) => {
            if (!ctx.state.queryRunner.isReleased) {
                await ctx.state.queryRunner.release();
            }

            await this.options.hooks?.afterHandle?.(ctx);

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

export type MakeRequestContextMwArgs = { operation: RouteOperation; subresourceRelations?: SubresourceRelation[] };

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

/** EntityRoute request context wrapping Context */
export type RequestContext<
    Entity extends GenericEntity = GenericEntity,
    Operation extends GroupsOperation = GroupsOperation,
    QP = QueryParams,
    State = ObjectLiteral
> = {
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
    /** Current route scope operation */
    operation?: Operation;
    /** Was entity re-fetched after a persist operation ? */
    wasAutoReloaded?: boolean;
};
export type RequestContextMinimal<Entity extends GenericEntity = GenericEntity> = Pick<
    RequestContext<Entity>,
    "requestId" | "operation" | "values"
>;

/** Custom state to pass to Context */
export type RequestState<
    Entity extends GenericEntity = GenericEntity,
    Operation extends GroupsOperation = GroupsOperation
> = {
    requestId: string;
    requestContext: RequestContext<Entity, Operation>;
    queryRunner: QueryRunner;
};

export type GenericRouteResponse = {
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
export type RouteResponseType = "item" | "collection" | "error" | "persist" | "delete";
export type RouteResponse<T extends RouteResponseType = any, Entity extends GenericEntity = GenericEntity> = (T extends
    | "item"
    | "persist"
    ? Partial<Entity>
    : {}) & {
    "@context": (T extends "collection"
        ? {
              /** Total number of items found for this request */
              totalItems?: number;
              /** Number of items retrieved for this request */
              retrievedItems: number;
          }
        : T extends "error"
        ? {
              /** Global response error */
              error: string;
          }
        : T extends "persist"
        ? {
              /** Entity validation errors */
              validationErrors: EntityErrorResults;
          }
        : {}) & {
        /** Current route operation */
        operation: string;
        /** Current entity's route */
        entity: string;
    };
} & (T extends "collection"
        ? {
              /** List of entities */
              items: Partial<Entity>[];
          }
        : T extends "delete"
        ? {
              /** deleted entity id */
              deleted: any;
          }
        : {});

export type ResponseTypeFromOperation<O> = O extends GroupsDefaultOperation
    ? O extends "details"
        ? "item"
        : O extends "list"
        ? "collection"
        : O extends "create" | "update"
        ? "persist"
        : any
    : any;
export type ResponseTypeFromCtxWithOperation<Ctx extends ContextWithState> = Ctx extends {
    state: {
        requestContext: {
            operation?: infer O;
        };
    };
}
    ? ResponseTypeFromOperation<O>
    : never;
/** Return type of EntityRoute.getList */
export type CollectionResult<Entity extends GenericEntity> = {
    items: Entity[];
    totalItems: number;
};

export type RouteControllerResult = Unpacked<ReturnType<RouteController<GenericEntity>[CrudAction["method"]]>>;
