import { getRepository, ObjectType, Repository, ObjectLiteral } from "typeorm";

import { RouteOperation } from "@/decorators/Groups";
import { AbstractFilterConfig } from "@/filters/AbstractFilter";
import { RouteSubresourcesMeta, SubresourceManager } from "@/router/SubresourceManager";
import { BridgeRouter, getRouterFactory, BridgeRouterRegisterFn } from "@/router/bridge/BridgeRouter";
import { formatRouteName } from "@/functions/route";
import { RouteActionConstructorData, RouteActionConfig, makeRouterFromActions } from "@/router/actions";
import { MiddlewareMaker, CRUD_ACTIONS } from "@/router/MiddlewareMaker";
import { CType } from "@/utils-types";

export class EntityRouter<Entity extends GenericEntity> {
    public readonly middlewareMaker: MiddlewareMaker<Entity>;
    public readonly subresourceManager: SubresourceManager<Entity>;

    // EntityRouter specifics
    private readonly repository: Repository<Entity>;
    private readonly options: EntityRouteConfig;
    private _router: BridgeRouter;

    get router() {
        return this._router;
    }

    constructor(
        public readonly entity: ObjectType<Entity>,
        public readonly routeMetadata: RouteMetadata,
        public readonly globalOptions: EntityRouterOptions
    ) {
        // EntityRouter specifics
        this.repository = getRepository(entity);
        this.options = { ...globalOptions, ...this.routeMetadata.options };

        // Managers/services
        this.subresourceManager = new SubresourceManager<Entity>(this.repository, this.routeMetadata);
        this.middlewareMaker = new MiddlewareMaker<Entity>(this.repository, this.options);
    }

    /** Make a Router for each given operations (and their associated mapping route) for this entity and its subresources and return it */
    public makeRouter<T = any>() {
        const routerFactory = getRouterFactory(this.globalOptions);
        const router = new BridgeRouter<T>(routerFactory, this.globalOptions.routerRegisterFn);
        const mwAdapter = this.globalOptions.middlewareAdapter;

        // CRUD routes
        let i = 0;
        for (i; i < this.routeMetadata.operations.length; i++) {
            const operation = this.routeMetadata.operations[i];
            const verb = CRUD_ACTIONS[operation].verb;
            const path = (this.routeMetadata.path + CRUD_ACTIONS[operation].path).toLowerCase();

            const requestContextMw = this.middlewareMaker.makeRequestContextMiddleware(operation);
            const responseMw = this.middlewareMaker.makeResponseMiddleware(operation);

            router.register({
                path,
                name: formatRouteName(path, operation),
                methods: [verb],
                middlewares: [mwAdapter(requestContextMw), mwAdapter(responseMw)],
            });

            if (operation === "delete") continue;

            const mappingMethod = this.middlewareMaker.makeRouteMappingMiddleware(operation);
            router.register({
                path: path + "/mapping",
                name: formatRouteName(path, operation) + "_mapping",
                methods: [verb],
                middlewares: [mwAdapter(mappingMethod)],
            });
        }

        // Subresoures routes
        this.subresourceManager.makeSubresourcesRoutes(router);

        // Custom actions routes
        if (this.options.actions) {
            const actions: RouteActionConfig[] = this.options.actions.map(this.addRequestContextMwToAction.bind(this));
            const data = { entityMetadata: this.repository.metadata, routeMetadata: this.routeMetadata };
            makeRouterFromActions<RouteActionConstructorData>(actions, { router }, data);
        }

        this._router = router;
        return router;
    }

    private addRequestContextMwToAction(action: RouteActionConfig): RouteActionConfig {
        return {
            ...action,
            middlewares: (action.middlewares || []).concat(
                this.globalOptions.middlewareAdapter(
                    this.middlewareMaker.makeRequestContextMiddleware(action.operation)
                )
            ),
        };
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

export type GenericEntity = ObjectLiteral & { id: string | number };

export type RouteMetadata = {
    /** The path prefix for every action of this route */
    path: string;
    /** List of operations to create a route for */
    operations: RouteOperation[];
    /** Specific options to be used on this EntityRoute, if none specified, will default to global options */
    options?: EntityRouteConfig;
};

export type RouteFiltersMeta = Record<string, AbstractFilterConfig>;

export type EntityRouterFactoryKind = "class" | "fn";
export type EntityRouterFactoryOptions<T, Kind = EntityRouterFactoryKind> = Kind extends "class"
    ? {
          /** Router class reference */
          routerFactoryClass: CType<T>;
          /** Router adapter function that makes the link between BridgeRouter register & actual router class route registering functions */
          routerRegisterFn: BridgeRouterRegisterFn<T>;
      }
    : T extends (...args: any) => any
    ? {
          /** Router factory function */
          routerFactoryFn: T;
          /** Router adapter function that makes the link between BridgeRouter register & actual router class route registering functions */
          routerRegisterFn: BridgeRouterRegisterFn<ReturnType<T>>;
      }
    : never;

export type EntityRouterClassOptions<T = any, U = EntityRouterFactoryKind> = EntityRouterFactoryOptions<T, U> & {
    /** MiddlewareAdapter to make generated middlewares framework-agnostic */
    middlewareAdapter: (mw: Function) => (...args: any) => any;
};

export type EntityRouteBaseOptions = {
    /** Custom actions using current EntityRouter prefix/instance */
    actions?: RouteActionConfig[];
};

export type EntityRouteOptions = {
    /** Is max depth enabled by default on all entities for any request context for this router */
    isMaxDepthEnabledByDefault?: boolean;
    /** Default level of depth at which the nesting should stop for this router */
    defaultMaxDepthLvl?: number;
    /** In case of max depth reached on a relation, should it at retrieve its id and then stop instead of just stopping ? */
    shouldMaxDepthReturnRelationPropsId?: boolean;
    /** In case of a relation with no other mapped props (from groups) for a request: should it unwrap "relation { id }" to relation = id ? */
    shouldEntityWithOnlyIdBeFlattenedToIri?: boolean;
    /** Should set subresource IRI for prop decorated with @Subresource */
    shouldSetSubresourcesIriOnItem?: boolean;
};
export type EntityRouteConfig = EntityRouteBaseOptions & EntityRouteOptions;

export type EntityRouterOptions<T = any> = EntityRouterClassOptions<T> & EntityRouteConfig;
