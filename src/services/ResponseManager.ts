import { Middleware, Context } from "koa";
import { Connection, DeleteResult, QueryRunner, Repository, SelectQueryBuilder } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import { RouteActionClass } from "@/services/AbstractRouteAction";
import { RouteOperation } from "@/mapping/decorators/Groups";
import { getRouteFiltersMeta, RouteFiltersMeta, GenericEntity } from "@/services/EntityRoute";
import { AbstractFilter, AbstractFilterConfig, QueryParams } from "@/filters/AbstractFilter";
import { EntityMapper } from "@/mapping/EntityMapper";
import { Denormalizer, EntityErrorResponse, EntityErrorResults } from "@/serializer/Denormalizer";
import { Normalizer } from "@/serializer/Normalizer";
import { AliasManager } from "@/serializer/AliasManager";
import { SubresourceManager, SubresourceRelation } from "@/services/SubresourceManager";

// TODO JWt (AuthProvider ?)
// TODO Decorators reunite with filters etc ? (DependsOn into src/mapping)
// TODO get rid of ramda
// import { isTokenValid, JwtDecoded } from "../JWT";
import { isType, isDev } from "@/functions/asserts";

export class ResponseManager<Entity extends GenericEntity> {
    private filtersMeta: RouteFiltersMeta;

    constructor(
        private connection: Connection,
        private repository: Repository<Entity>,
        private subresourceManager: SubresourceManager<Entity>,
        private aliasManager: AliasManager,
        private denormalizer: Denormalizer<Entity>,
        private normalizer: Normalizer,
        private mapper: EntityMapper
    ) {
        this.filtersMeta = getRouteFiltersMeta(repository.metadata.target as Function);
    }

    get metadata() {
        return this.repository.metadata;
    }

    get filters() {
        return Object.values(this.filtersMeta);
    }

    public async create(ctx: RequestContext<Entity>, queryRunner: QueryRunner) {
        const { operation, values, subresourceRelation } = ctx;

        // Auto-join subresource parent on body values
        if (
            subresourceRelation &&
            (subresourceRelation.relation.isOneToOne || subresourceRelation.relation.isManyToOne)
        ) {
            (values as any)[subresourceRelation.relation.inverseSidePropertyPath] = {
                id: subresourceRelation.id,
            };
        }

        if (!Object.keys(values).length) {
            return { error: "Body can't be empty on create operation" };
        }

        const insertResult = await this.denormalizer.insertItem(ctx, {}, queryRunner);

        if (isType<EntityErrorResponse>(insertResult, "hasValidationErrors" in insertResult)) {
            return insertResult;
        }

        if (
            subresourceRelation &&
            (subresourceRelation.relation.isOneToMany || subresourceRelation.relation.isManyToMany)
        ) {
            const repository = queryRunner.manager.getRepository<Entity>(this.metadata.target);
            const qb = repository.createQueryBuilder(this.metadata.tableName);
            await qb
                .relation(subresourceRelation.relation.target, subresourceRelation.relation.propertyName)
                .of(subresourceRelation.id)
                .add(insertResult);
        }

        return this.getDetails({ ...ctx, operation, entityId: insertResult.id }, queryRunner);
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getList(ctx: RequestContext<Entity>, queryRunner: QueryRunner) {
        const { operation, queryParams, subresourceRelation } = ctx;

        const repository = queryRunner.manager.getRepository<Entity>(this.metadata.target);
        const qb = repository.createQueryBuilder(this.metadata.tableName);

        // Apply a max item to retrieve
        qb.take(500);

        if (subresourceRelation) {
            this.subresourceManager.joinSubresourceOnInverseSide(qb, subresourceRelation);
        }

        if (this.filtersMeta) {
            this.applyFilters(queryParams, qb);
        }

        const collectionResult = await this.normalizer.getCollection(qb, operation || "list");

        return {
            items: collectionResult[0],
            totalItems: collectionResult[1],
        } as CollectionResult<Entity>;
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getDetails(ctx: RequestContext<Entity>, queryRunner: QueryRunner) {
        const { operation, entityId, subresourceRelation } = ctx;

        const repository = queryRunner.manager.getRepository<Entity>(this.metadata.target);
        const qb = repository.createQueryBuilder(this.metadata.tableName);

        if (subresourceRelation) {
            this.subresourceManager.joinSubresourceOnInverseSide(qb, subresourceRelation);
        }

        return await this.normalizer.getItem<Entity>(qb, entityId, operation || "details");
    }

    public async update(ctx: RequestContext<Entity>, queryRunner: QueryRunner) {
        const { operation, values, entityId, decoded } = ctx;

        (values as any).id = entityId;
        const result = await this.denormalizer.updateItem(ctx, {}, queryRunner);

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        return this.getDetails({ ...ctx, operation, decoded, entityId: result.id }, queryRunner);
    }

    public async delete({ entityId, subresourceRelation }: RequestContext<Entity>, queryRunner: QueryRunner) {
        // Remove relation if used on a subresource
        if (subresourceRelation) {
            const repository = queryRunner.manager.getRepository<Entity>(this.metadata.target);
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
            return queryRunner.manager.getRepository(this.metadata.target).delete(entityId);
        }
    }

    public makeRequestContextMiddleware(
        operation: RouteOperation,
        subresourceRelation?: SubresourceRelation
    ): Middleware {
        return async (ctx, next) => {
            if (subresourceRelation) {
                subresourceRelation = subresourceRelation;
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
            if (operation === "list") params.queryParams = ctx.query;

            this.aliasManager.resetList();

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
            const { requestContext: params, queryRunner } = ctx.state as RequestState<Entity>;

            const method = CRUD_ACTIONS[operation].method;
            let response: IRouteResponse = {
                "@context": {
                    operation,
                    entity: this.metadata.tableName,
                },
            };
            if (params.isUpdateOrCreate) response["@context"].errors = null;

            try {
                const result = await this[method]({ operation, ...params }, queryRunner);

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
                routeMapping: this.mapper.make(operation, pretty),
            };
            next();
        };
    }

    /** Creates a new instance of a given Filter */
    private makeFilter<Filter extends AbstractFilter>(config: AbstractFilterConfig): Filter {
        return new config.class({
            config,
            entityMetadata: this.metadata,
            normalizer: this.normalizer,
            aliasManager: this.aliasManager,
        });
    }

    /** Apply every registered filters on this route */
    private applyFilters(queryParams: QueryParams, qb: SelectQueryBuilder<Entity>) {
        this.filters.forEach((filterOptions) => {
            this.makeFilter(filterOptions).apply({ queryParams, qb, whereExp: qb });
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
    /** Class that implements IRouteAction, onRequest method will be called by default unless a custom action parameter is defined */
    class?: RouteActionClass;
    /** Custom method name of RouteAction class to call for this verb+path, mostly useful to re-use the same class for multiple actions */
    action?: string;
};

export type CustomActionFunction = BaseCustomAction & {
    /** Custom handler (actually is a middleware) */
    handler?: Function;
};

export type CustomAction = CustomActionClass | CustomActionFunction;

export type JwtDecoded<Payload = Record<string, any>> = { iat: number; exp: number } & Payload;
export type RequestContext<Entity extends GenericEntity = GenericEntity> = {
    /** Request context */
    ctx: Context;
    /** Current route entity id */
    entityId?: string | number;
    /** Subresource relation with parent, used to auto-join on this entity's relation inverse side */
    subresourceRelation?: SubresourceRelation;
    /** Is update or create operation ? To check if there is a body sent */
    isUpdateOrCreate?: boolean;
    /** Request body values sent */
    values?: QueryDeepPartialEntity<Entity>;
    /** Request query params */
    queryParams?: any;
    /** Custom operation for a custom action */
    operation?: RouteOperation;
    /** Decoded JWT Token */
    decoded?: JwtDecoded;
};

export type RequestState<Entity extends GenericEntity = GenericEntity> = {
    requestContext: RequestContext<Entity>;
    queryRunner: QueryRunner;
};

interface IRouteResponse {
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
}

/** Return type of EntityRoute.getList */
type CollectionResult<Entity extends GenericEntity> = {
    items: Entity[];
    totalItems: number;
};
