import * as Router from "koa-router";
import { Connection, getConnection, getRepository, ObjectType, Repository, ObjectLiteral } from "typeorm";

import { entityRoutesContainer } from "..";
import { IRouteAction } from "@/services/AbstractRouteAction";
import { RouteOperation, RouteDefaultOperation } from "@/mapping/decorators/Groups";
import { AbstractFilterConfig } from "@/filters/AbstractFilter";
import { EntityMapper } from "@/mapping/EntityMapper";
import { CRUD_ACTIONS, CustomActionClass, ResponseManager, CustomAction } from "@/services/ResponseManager";
import { Denormalizer } from "@/serializer/Denormalizer";
import { Normalizer } from "@/serializer/Normalizer";
import { AliasManager } from "@/serializer/AliasManager";
import { RouteSubresourcesMeta, SubresourceManager } from "@/services/SubresourceManager";
import { isType } from "@/functions/asserts";

// Actually make it a service ? @Service
// Or at least EntityMapper, AliasManager, Normalizer, Denormalizer, SubresourceManager, ResponseManager
// Make them independant from each other, extrac their function outside class scope & use it in class scope as accelerator
export class EntityRouteService<Entity extends GenericEntity> {
    // Entity Route specifics
    public readonly repository: Repository<Entity>;
    public readonly options: EntityRouteOptions;
    public readonly customActions: Record<string, IRouteAction> = {};

    // Meta
    public readonly routeMetadata: RouteMetadata;

    // Managers/services
    public readonly connection: Connection;
    public readonly mapper: EntityMapper;
    public readonly aliasManager: AliasManager;
    public readonly normalizer: Normalizer;
    public readonly denormalizer: Denormalizer<Entity>;
    public readonly subresourceManager: SubresourceManager<Entity>;
    public readonly responseManager: ResponseManager<Entity>;

    constructor(entity: ObjectType<Entity>, globalOptions: EntityRouteOptions = {}) {
        // Entity Route specifics
        this.repository = getRepository(entity);
        this.routeMetadata = getRouteMetadata(entity);
        this.options = { ...globalOptions, ...this.routeMetadata.options };

        // Managers/services
        this.connection = getConnection();
        this.mapper = new EntityMapper(this.repository.metadata, {
            defaultMaxDepthLvl: this.options.defaultMaxDepthLvl,
            isMaxDepthEnabledByDefault: this.options.isMaxDepthEnabledByDefault,
        });
        this.aliasManager = new AliasManager();
        this.normalizer = new Normalizer(this.repository.metadata, this.mapper, this.aliasManager, {
            shouldEntityWithOnlyIdBeFlattenedToIri: this.options.shouldEntityWithOnlyIdBeFlattenedToIri,
            shouldMaxDepthReturnRelationPropsId: this.options.shouldEntityWithOnlyIdBeFlattenedToIri,
            shouldSetSubresourcesIriOnItem: this.options.shouldSetSubresourcesIriOnItem,
        });
        this.denormalizer = new Denormalizer(this.repository, this.mapper);
        this.subresourceManager = new SubresourceManager<Entity>(
            this.repository,
            this.routeMetadata,
            this.aliasManager
        );
        this.responseManager = new ResponseManager<Entity>(
            this.connection,
            this.repository,
            this.subresourceManager,
            this.aliasManager,
            this.denormalizer,
            this.normalizer,
            this.mapper
        );

        // Add this EntityRoute to the list (used by subresources/custom actions/services)
        entityRoutesContainer[entity.name] = this as any;

        // Instanciate and store every custom action classes
        if (this.options.actions) {
            this.initCustomActionsClasses();
        }
    }

    /** Make a Koa Router for each given operations (and their associated mapping route) for this entity and its subresources and return it */
    public makeRouter() {
        const router = new Router();

        // CRUD routes
        let i = 0;
        for (i; i < this.routeMetadata.operations.length; i++) {
            const operation = this.routeMetadata.operations[i];
            const verb = CRUD_ACTIONS[operation].verb;
            const path = this.routeMetadata.path + CRUD_ACTIONS[operation].path;

            const requestContextMw = this.responseManager.makeRequestContextMiddleware(operation);
            const responseMw = this.responseManager.makeResponseMiddleware(operation);

            (<any>router)[verb](path, requestContextMw, responseMw);

            if (operation === "delete") continue;

            const mappingMethod = this.responseManager.makeRouteMappingMiddleware(operation);
            (<any>router)[verb](path + "/mapping", mappingMethod);
        }

        // Subresoures routes
        this.subresourceManager.makeSubresourcesRoutes(router as any); // TODO typings

        // Custom actions routes
        if (this.options.actions) {
            i = 0;
            for (i; i < this.options.actions.length; i++) {
                const actionItem = this.options.actions[i];
                const { operation, verb, path: actionPath, middlewares } = actionItem;
                const path = this.routeMetadata.path + actionPath;
                const requestContextMw = this.responseManager.makeRequestContextMiddleware(operation);
                let customActionMw;

                if (isType<CustomActionClass>(actionItem, "class" in actionItem)) {
                    const { action, class: actionClass } = actionItem;
                    const method = (action as keyof IRouteAction) || "onRequest";
                    customActionMw = this.customActions[actionClass.name][method].bind(
                        this.customActions[actionClass.name]
                    );
                } else {
                    customActionMw = actionItem.handler;
                }

                (<any>router)[verb](path, ...(middlewares || []), requestContextMw, customActionMw);
            }
        }

        return router;
    }

    private initCustomActionsClasses() {
        this.options.actions.forEach((action) => {
            if ("class" in action && !this.customActions[action.class.name]) {
                this.customActions[action.class.name] = new action.class({
                    entityRoute: this as any,
                    middlewares: action.middlewares || [],
                });
            }
        });
    }
}

export const ROUTE_METAKEY = Symbol("route");
export const getRouteMetadata = (entity: Function): RouteMetadata => Reflect.getOwnMetadata(ROUTE_METAKEY, entity);

export const ROUTE_SUBRESOURCES = Symbol("route");
export const getRouteSubresourcesMetadata = <Entity extends GenericEntity>(
    entity: Function
): RouteSubresourcesMeta<Entity> =>
    Reflect.getOwnMetadata(ROUTE_SUBRESOURCES, entity) || {
        parent: entity,
        properties: {},
    };

export const ROUTE_FILTERS_METAKEY = Symbol("filters");
export const getRouteFiltersMeta = (entity: Function): RouteFiltersMeta =>
    Reflect.getOwnMetadata(ROUTE_FILTERS_METAKEY, entity);

/**
 * @example
 *
 * [at]PaginationFilter([], { all: true })
 * [at]SearchFilter(["id", { name: "startsWith" }])
 * [at]EntityRoute("/users", ["create", "list", "details", "update", "delete"], {
 *     actions: [
 *         {
 *             verb: "get",
 *             path: "/custom",
 *             class: CustomAction,
 *             middlewares: [
 *                 async function(ctx, next) {
 *                     console.log("before custom action");
 *                     await next();
 *                     console.log("after custom action");
 *                 },
 *             ],
 *         },
 *     ],
 * })
 */
export const EntityRoute = (
    path: string,
    operations: RouteDefaultOperation[] = [],
    options: EntityRouteOptions = {}
): ClassDecorator => {
    return (target: Function) => {
        Reflect.defineMetadata(ROUTE_METAKEY, { path, operations, options }, target);
    };
};

export type GenericEntity = ObjectLiteral & { id: string | number };

export type RouteMetadata = {
    /** The path prefix for every action of this route */
    path: string;
    /** List of operations to create a route for */
    operations: RouteOperation[];
    /** Specific options to be used on this EntityRoute, if none specified, will default to global options */
    options?: EntityRouteOptions;
};

export type RouteFiltersMeta = Record<string, AbstractFilterConfig>;

export type EntityRouteOptions = {
    actions?: CustomAction[];
    isMaxDepthEnabledByDefault?: boolean;
    /** Level of depth at which the nesting should stop */
    defaultMaxDepthLvl?: number;
    /** In case of max depth reached on a relation, should it at retrieve its id and then stop instead of just stopping ? */
    shouldMaxDepthReturnRelationPropsId?: boolean;
    /** In case of a relation with no other mapped props (from groups) for a request: should it unwrap "relation { id }" to relation = id ? */
    shouldEntityWithOnlyIdBeFlattenedToIri?: boolean;
    /** Should set subresource IRI for prop decorated with @Subresource */
    shouldSetSubresourcesIriOnItem?: boolean;
};
