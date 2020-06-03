import { Connection, getConnection, getRepository, ObjectType, Repository, ObjectLiteral } from "typeorm";

import { RouteOperation } from "@/decorators/Groups";
import { AbstractFilterConfig } from "@/filters/AbstractFilter";
import { RouteSubresourcesMeta, SubresourceManager } from "@/router/SubresourceManager";
import {
    BridgeRouter,
    BridgeRouterClassReference,
    BridgeRouterRegisterFn,
    makeRouterFromActions,
} from "@/bridges/routers/BridgeRouter";
import { formatRouteName } from "@/functions/route";
import { RouteActionConstructorData, CustomAction } from "@/router/AbstractRouteAction";
import { RouteManager, CRUD_ACTIONS } from "@/router/RouteManager";

export class EntityRouter<Entity extends GenericEntity> {
    public readonly routeManager: RouteManager<Entity>;
    public readonly subresourceManager: SubresourceManager<Entity>;

    // Entity Route specifics
    private readonly repository: Repository<Entity>;
    private readonly options: EntityRouteConfig;

    // Managers/services
    private readonly connection: Connection;

    constructor(
        public readonly entity: ObjectType<Entity>,
        public readonly routeMetadata: RouteMetadata,
        public readonly globalOptions: EntityRouterOptions
    ) {
        // Entity Route specifics
        this.repository = getRepository(entity);
        this.options = { ...globalOptions, ...this.routeMetadata.options };

        // Managers/services
        this.connection = getConnection();
        this.subresourceManager = new SubresourceManager<Entity>(this.repository, this.routeMetadata);
        this.routeManager = new RouteManager<Entity>(this.connection, this.repository, this.options);
    }

    /** Make a Router for each given operations (and their associated mapping route) for this entity and its subresources and return it */
    public makeRouter<T = any>() {
        const router = new BridgeRouter<T>(this.globalOptions.routerClass, this.globalOptions.routerRegisterFn);

        // CRUD routes
        let i = 0;
        for (i; i < this.routeMetadata.operations.length; i++) {
            const operation = this.routeMetadata.operations[i];
            const verb = CRUD_ACTIONS[operation].verb;
            const path = this.routeMetadata.path + CRUD_ACTIONS[operation].path;

            const requestContextMw = this.routeManager.makeRequestContextMiddleware(operation);
            const responseMw = this.routeManager.makeResponseMiddleware(operation);

            router.register({
                path,
                name: formatRouteName(path, operation),
                methods: [verb],
                middlewares: [requestContextMw, responseMw],
            });

            if (operation === "delete") continue;

            const mappingMethod = this.routeManager.makeRouteMappingMiddleware(operation);
            router.register({
                path: path + "/mapping",
                name: formatRouteName(path, operation) + "_mapping",
                methods: [verb],
                middlewares: [mappingMethod],
            });
        }

        // Subresoures routes
        this.subresourceManager.makeSubresourcesRoutes(router);

        // Custom actions routes
        if (this.options.actions) {
            const actions: CustomAction[] = this.options.actions.map(this.addRequestContextMwToAction.bind(this));
            const data = { entityMetadata: this.repository.metadata, routeMetadata: this.routeMetadata };
            makeRouterFromActions<RouteActionConstructorData>(actions, { router }, data);
        }

        return router;
    }

    private addRequestContextMwToAction(action: CustomAction): CustomAction {
        return {
            ...action,
            middlewares: (action.middlewares || []).concat(
                this.routeManager.makeRequestContextMiddleware(action.operation)
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

export type GenericEntity = ObjectLiteral & { id: string | number; getIri?: () => string };

export type RouteMetadata = {
    /** The path prefix for every action of this route */
    path: string;
    /** List of operations to create a route for */
    operations: RouteOperation[];
    /** Specific options to be used on this EntityRoute, if none specified, will default to global options */
    options?: EntityRouteConfig;
};

export type RouteFiltersMeta = Record<string, AbstractFilterConfig>;

export type EntityRouterClassOptions<T = any> = {
    /** Router class reference */
    routerClass: BridgeRouterClassReference<T>;
    /** Router adapter function that makes the link between BridgeRouter register & actual router class route registering functions */
    routerRegisterFn: BridgeRouterRegisterFn<T>;
};

export type EntityRouteBaseOptions = {
    /** Custom actions using current EntityRouter prefix/instance */
    actions?: CustomAction[];
};

export type EntityRouteOptions = {
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
export type EntityRouteConfig = EntityRouteBaseOptions & EntityRouteOptions;

export type EntityRouterOptions<T = any> = EntityRouterClassOptions<T> & EntityRouteConfig;
