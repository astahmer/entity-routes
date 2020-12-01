import { ObjectType, Repository, getRepository } from "typeorm";

import {
    AbstractFilterConfig,
    AnyFunction,
    BridgeRouter,
    BridgeRouterRegisterFn,
    CRUD_ACTIONS,
    CreateUpdateOptions,
    GroupsOperation,
    HookSchema,
    JoinAndSelectExposedPropsOptions,
    ListDetailsOptions,
    MiddlewareMaker,
    RouteActionClassOptions,
    RouteActionConfig,
    RouteActionConstructorData,
    RouteActionFunctionOptions,
    RouteOperation,
    RouteSubresourcesMeta,
    SubresourceMaker,
    SubresourceMakerOptions,
    WriterOptions,
    deepMerge,
    formatRouteName,
    makeRouterFromActions,
} from "@entity-routes/core";

export class EntityRouter<Entity extends GenericEntity> {
    public readonly middlewareMaker: MiddlewareMaker<Entity>;
    public readonly subresourceMaker: SubresourceMaker<Entity>;

    // EntityRouter specifics
    private readonly repository: Repository<Entity>;
    private readonly options: EntityRouteConfig;
    private readonly factoryOptions: EntityRouterFactoryOptions;
    private _router: BridgeRouter;

    get router() {
        return this._router;
    }

    constructor(
        public readonly entity: ObjectType<Entity>,
        public readonly routeMetadata: RouteMetadata,
        public readonly routerOptions: EntityRouterOptions
    ) {
        // Split options
        const { routerFactoryFn, routerRegisterFn, middlewareAdapter, ...globalOptions } = routerOptions;
        this.factoryOptions = { routerFactoryFn, routerRegisterFn, middlewareAdapter };

        // EntityRouter specifics
        this.repository = getRepository(entity);
        this.options = deepMerge({}, globalOptions, this.routeMetadata.options);

        // Managers/services
        this.subresourceMaker = new SubresourceMaker<Entity>(
            this.repository,
            this.routeMetadata,
            this.factoryOptions.middlewareAdapter,
            this.options.defaultSubresourcesOptions
        );
        this.middlewareMaker = new MiddlewareMaker<Entity>(this.repository, this.options);
    }

    /** Make a Router for each given operations (and their associated mapping route) for this entity and its subresources and return it */
    public makeRouter<T = any>() {
        const routerFactory = this.factoryOptions.routerFactoryFn;
        const router = new BridgeRouter<T>(routerFactory, this.factoryOptions.routerRegisterFn);
        const mwAdapter = this.factoryOptions.middlewareAdapter;

        // Add restore route for soft deletion
        if (this.options.allowSoftDelete && this.routeMetadata.operations.includes("delete")) {
            this.routeMetadata.operations.push("restore");
        }

        // CRUD routes
        let i = 0;
        for (i; i < this.routeMetadata.operations.length; i++) {
            const operation = this.routeMetadata.operations[i];
            const verb = CRUD_ACTIONS[operation].verb;
            const path = (this.routeMetadata.path + CRUD_ACTIONS[operation].path).toLowerCase();
            const name = formatRouteName(this.repository.metadata.tableName, operation);

            const requestContextMw = this.middlewareMaker.makeRequestContextMiddleware({ operation });
            const responseMw = this.middlewareMaker.makeResponseMiddleware();
            const endResponseMw = this.middlewareMaker.makeEndResponseMiddleware();

            router.register({
                path,
                name,
                methods: [verb],
                operation,
                middlewares: [
                    ...(this.options.beforeCtxMiddlewares || []),
                    mwAdapter(requestContextMw),
                    ...(this.options.afterCtxMiddlewares || []),
                    mwAdapter(responseMw),
                    mwAdapter(endResponseMw),
                ],
            });

            // No need for a mapping route on delete/restore operation
            if (operationsWithoutMapping.includes(operation)) {
                continue;
            }

            const mappingMethod = this.middlewareMaker.makeRouteMappingMiddleware(operation);
            router.register({
                path: path + "/mapping",
                name: name + "_mapping",
                methods: [verb],
                operation,
                middlewares: [mwAdapter(mappingMethod)],
            });
        }

        // Subresoures routes
        this.subresourceMaker.makeSubresourcesRoutes(router);

        // Custom actions routes
        if (this.options.actions) {
            const actions: EntityRouteActionConfig[] = this.options.actions.map(
                this.addRequestContextMwToAction.bind(this)
            );
            const data = { entityMetadata: this.repository.metadata, routeMetadata: this.routeMetadata };
            makeRouterFromActions<RouteActionConstructorData>(actions, { router }, data);
        }

        this._router = router;
        return router;
    }

    private addRequestContextMwToAction(action: EntityRouteActionConfig): RouteActionConfig {
        const mwAdapter = this.factoryOptions.middlewareAdapter;
        return {
            ...action,
            middlewares: [
                ...(action.beforeCtxMiddlewares || []),
                mwAdapter(this.middlewareMaker.makeRequestContextMiddleware({ operation: action.operation })),
                ...(action.afterCtxMiddlewares || []),
            ],
        };
    }
}

export const operationsWithoutMapping = ["delete", "restore"];

export const ROUTE_METAKEY = Symbol("route");
export const getRouteMetadata = (entity: Function): RouteMetadata => Reflect.getOwnMetadata(ROUTE_METAKEY, entity);

export const ROUTE_SUBRESOURCES_METAKEY = Symbol("subresources");
export const getRouteSubresourcesMetadata = <Entity extends GenericEntity>(
    entity: Function
): RouteSubresourcesMeta<Entity> =>
    Reflect.getOwnMetadata(ROUTE_SUBRESOURCES_METAKEY, entity) || {
        parent: entity,
        properties: {},
    };

export const ROUTE_FILTERS_METAKEY = Symbol("filters");
export const getRouteFiltersMeta = (entity: Function): RouteFiltersMeta =>
    Reflect.getOwnMetadata(ROUTE_FILTERS_METAKEY, entity);

export interface GenericEntity {
    [k: string]: any;
    id: string | number;
}

export type RouteMetadata = {
    /** The path prefix for every action of this route */
    path: string;
    /** List of operations to create a route for */
    operations: RouteOperation[];
    /** Specific options to be used on this EntityRoute, if none specified, will default to global options */
    options?: EntityRouteConfig;
};

export type RouteFiltersMeta = Record<string, AbstractFilterConfig>;

export type EntityRouterFactoryOptions<T extends AnyFunction = any> = {
    /** Router factory function */
    routerFactoryFn: T;
    /** Router adapter function that makes the link between BridgeRouter register & actual router class route registering functions */
    routerRegisterFn: BridgeRouterRegisterFn<ReturnType<T>>;
    /** MiddlewareAdapter to make generated middlewares framework-agnostic */
    middlewareAdapter: (mw: Function) => AnyFunction;
};

export type EntityRouteActionConfig = Omit<RouteActionConfig, "middlewares"> &
    Pick<EntityRouteOptions, "beforeCtxMiddlewares" | "afterCtxMiddlewares"> &
    (RouteActionClassOptions | RouteActionFunctionOptions);

export type EntityRouteOptions = {
    defaultMaxDepthOptions?: JoinAndSelectExposedPropsOptions;
    /** Default ListDetailsOptions, deep merged with defaultEntityRouteOptions */
    defaultListDetailsOptions?: ListDetailsOptions;
    /** Default CreateUpdateOptions, deep merged with defaultEntityRouteOptions */
    defaultCreateUpdateOptions?: CreateUpdateOptions;
    /** Default subresources options, deep merged with defaultEntityRouteOptions */
    defaultSubresourcesOptions?: SubresourceMakerOptions;
    /** Default subresources options, deep merged with defaultEntityRouteOptions */
    defaultWriterOptions?: WriterOptions;
    /** Allow soft deletion using TypeORM @DeleteDateColumn */
    allowSoftDelete?: boolean;
    /** Hook schema of custom functions to be run at specific operations in a request processing */
    hooks?: HookSchema;
    /** Middlewares to be pushed before requestContext middleware */
    beforeCtxMiddlewares?: Function[];
    /** Middlewares to be pushed after requestContext middleware */
    afterCtxMiddlewares?: Function[];
};
export type EntityRouteScopedOptions = Pick<
    EntityRouteOptions,
    "defaultListDetailsOptions" | "defaultCreateUpdateOptions" | "defaultWriterOptions"
>;
/** Allow overriding RouteController options on different operations */
export type EntityRouteScopedOptionsFn = (operation: GroupsOperation) => EntityRouteScopedOptions;
export type WithEntityRouteScopedOptions = { scopedOptions?: EntityRouteScopedOptionsFn };
export type EntityRouteConfig = {
    /** Custom actions using current EntityRouter prefix/instance */
    actions?: EntityRouteActionConfig[];
} & EntityRouteOptions &
    WithEntityRouteScopedOptions;

export type EntityRouterOptions<T extends AnyFunction<any> = any> = EntityRouterFactoryOptions<T> & EntityRouteConfig;
