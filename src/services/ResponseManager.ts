import { Connection, DeleteResult, QueryRunner, Repository, SelectQueryBuilder, getRepository } from "typeorm";
import { Container } from "typedi";

import { RouteActionClass } from "@/router/AbstractRouteAction";
import { RouteOperation } from "@/decorators/Groups";
import { getRouteFiltersMeta, RouteFiltersMeta, GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { AbstractFilter, AbstractFilterConfig, QueryParams } from "@/filters/AbstractFilter";
import { EntityErrorResponse, Denormalizer } from "@/serializer/Denormalizer";
import { Normalizer } from "@/serializer/Normalizer";
import { AliasManager } from "@/serializer/AliasManager";
import { SubresourceRelation } from "@/services/SubresourceManager";

// TODO JWt (AuthProvider ?)
// TODO get rid of ramda
// TODO (global) Use object as fn arguments rather than chaining them
// TODO Hooks (before/afterPersist (create+update), before/afterValidate, before/afterLoad (list+details ?), beforeAfter/remove)
// import { isTokenValid, JwtDecoded } from "../JWT";
import { isType, isDev } from "@/functions/asserts";
import { MappingManager } from "./MappingManager";
import { EntityErrorResults } from "@/serializer/Validator";
import { RelationManager } from "@/services/RelationManager";
import { Context } from "@/utils-types";
import { Middleware } from "koa"; // TODO use Middleware from/util-types = wrap ctx since ctx.params/body.state do not exist for Express

// TODO RouteManager ? for makeRequestContextMw / makeResponseMw / makeRouteMappingMw / make/apply filters
// TODO remove public from every services methods when not needed

export class ResponseManager<Entity extends GenericEntity> {
    private filtersMeta: RouteFiltersMeta;

    get normalizer() {
        return Container.get(Normalizer);
    }

    get denormalizer() {
        return Container.get(Denormalizer) as Denormalizer;
    }

    get mappingManager() {
        return Container.get(MappingManager);
    }

    get relationManager() {
        return Container.get(RelationManager);
    }

    get metadata() {
        return this.repository.metadata;
    }

    get filters() {
        return Object.values(this.filtersMeta);
    }

    constructor(
        private connection: Connection,
        private repository: Repository<Entity>,
        private options: EntityRouteOptions
    ) {
        this.filtersMeta = getRouteFiltersMeta(repository.metadata.target as Function);
    }

    public async create(ctx: RequestContext<Entity>) {
        const { operation = "create", values, subresourceRelation } = ctx;

        if (!Object.keys(values).length) {
            return { error: "Body can't be empty on create operation" };
        }

        // Auto-join subresource parent on body values
        if (
            subresourceRelation &&
            (subresourceRelation.relation.isOneToOne || subresourceRelation.relation.isManyToOne)
        ) {
            (values as any)[subresourceRelation.relation.inverseSidePropertyPath] = {
                id: subresourceRelation.id,
            };
        }

        const insertResult = await this.denormalizer.saveItem({
            ctx,
            rootMetadata: this.metadata,
            routeOptions: this.options,
        });

        if (isType<EntityErrorResponse>(insertResult, "hasValidationErrors" in insertResult)) {
            return insertResult;
        }

        if (
            subresourceRelation &&
            (subresourceRelation.relation.isOneToMany || subresourceRelation.relation.isManyToMany)
        ) {
            const repository = getRepository<Entity>(this.metadata.target);
            const qb = repository.createQueryBuilder(this.metadata.tableName);
            await qb
                .relation(subresourceRelation.relation.target, subresourceRelation.relation.propertyName)
                .of(subresourceRelation.id)
                .add(insertResult);
        }

        return this.getDetails({ ...ctx, operation, entityId: insertResult.id });
    }

    public async update(ctx: RequestContext<Entity>) {
        const { operation = "update", values, entityId } = ctx;

        (values as any).id = entityId;
        const result = await this.denormalizer.saveItem({
            ctx,
            rootMetadata: this.metadata,
            routeOptions: this.options,
        });

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        return this.getDetails({ ...ctx, operation, entityId: result.id });
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getList(ctx: RequestContext<Entity>) {
        const { operation, queryParams, subresourceRelation } = ctx;

        const repository = getRepository<Entity>(this.metadata.target);
        const qb = repository.createQueryBuilder(this.metadata.tableName);

        // Apply a max item to retrieve
        qb.take(500);

        const aliasManager = new AliasManager();
        if (subresourceRelation) {
            this.relationManager.joinSubresourceOnInverseSide(qb, this.metadata, aliasManager, subresourceRelation);
        }

        if (this.filtersMeta) {
            this.applyFilters(queryParams, qb, aliasManager);
        }

        const collectionResult = await this.normalizer.getCollection(
            this.metadata,
            qb,
            aliasManager,
            operation || "list",
            this.options
        );

        return {
            items: collectionResult[0],
            totalItems: collectionResult[1],
        } as CollectionResult<Entity>;
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getDetails(ctx: RequestContext<Entity>) {
        const { operation, entityId, subresourceRelation } = ctx;

        const repository = getRepository<Entity>(this.metadata.target);
        const qb = repository.createQueryBuilder(this.metadata.tableName);

        const aliasManager = new AliasManager();
        if (subresourceRelation) {
            this.relationManager.joinSubresourceOnInverseSide(qb, this.metadata, aliasManager, subresourceRelation);
        }

        return await this.normalizer.getItem<Entity>(
            this.metadata,
            qb,
            aliasManager,
            entityId,
            operation || "details",
            this.options
        );
    }

    public async delete({ entityId, subresourceRelation }: RequestContext<Entity>) {
        // Remove relation if used on a subresource
        if (subresourceRelation) {
            const repository = getRepository<Entity>(this.metadata.target);
            const qb = repository.createQueryBuilder(this.metadata.tableName);

            const query = qb
                .relation(subresourceRelation.relation.target, subresourceRelation.relation.propertyName)
                .of(subresourceRelation.id);

            if (subresourceRelation.relation.isOneToOne || subresourceRelation.relation.isManyToOne) {
                await query.set(null);
            } else if (subresourceRelation.relation.isOneToMany || subresourceRelation.relation.isManyToMany) {
                await query.remove(entityId);
            }
            return { affected: 1, raw: { insertId: entityId } };
        } else {
            return getRepository(this.metadata.target).delete(entityId);
        }
    }

    public makeRequestContextMiddleware(
        operation: RouteOperation,
        subresourceRelation?: SubresourceRelation
    ): Middleware {
        return async (ctx, next) => {
            if (subresourceRelation) {
                subresourceRelation.id = parseInt(ctx.params[subresourceRelation.param]);
            }

            // Add decoded token in requestContext
            let decoded: JwtDecoded;
            if (ctx.req.headers.authorization) {
                // decoded = await getDecodedJwtToken(ctx.req.headers.authorization) // TODO
            }

            const params: RequestContext<Entity> = {
                ctx,
                decoded,
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
                const result = await this[method]({ operation, ...params });

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

    /** Creates a new instance of a given Filter */
    private makeFilter<Filter extends AbstractFilter>(config: AbstractFilterConfig): Filter {
        return new config.class({
            config,
            entityMetadata: this.metadata,
        });
    }

    /** Apply every registered filters on this route */
    private applyFilters(queryParams: QueryParams, qb: SelectQueryBuilder<Entity>, aliasManager: AliasManager) {
        // TODO Cache filter class rather than creating new ones every time
        this.filters.forEach((filterOptions) => {
            this.makeFilter(filterOptions).apply({ queryParams, qb, aliasManager });
        });
    }
}

type CrudActions = Omit<Record<RouteOperation | "delete", CrudAction>, "all">;

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

export type BaseCustomAction = Omit<CrudAction, "method"> & {
    /** Custom operation for that action */
    operation?: RouteOperation;
    /** List of middlewares to be called (in the same order as defined here) */
    middlewares?: Middleware[];
};

export type CustomActionClass = BaseCustomAction & {
    /** Class that implements IRouteAction, onRequest method will be called by default unless a method key is provided */
    class?: RouteActionClass;
    /** Method name of RouteAction class to call for this verb+path, mostly useful to re-use the same class for multiple actions */
    method?: string;
};

export type CustomActionFunction = BaseCustomAction & {
    /** Route handler (actually is a middleware) */
    handler?: Function;
};

export type CustomAction = CustomActionClass | CustomActionFunction;

export type JwtDecoded<Payload = Record<string, any>> = { iat: number; exp: number } & Payload;

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
    /** Decoded JWT Token */
    decoded?: JwtDecoded; // TODO data?: any instead
};

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
type CollectionResult<Entity extends GenericEntity> = {
    items: Entity[];
    totalItems: number;
};
