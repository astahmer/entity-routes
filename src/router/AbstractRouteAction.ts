import { EntityMetadata } from "typeorm";

import { RouteOperation } from "@/decorators/Groups";
import { RouteMetadata, EntityRouterFactoryOptions } from "@/router/EntityRouter";
import { BridgeRouter } from "@/router/bridge/BridgeRouter";
import { CrudAction } from "@/router/RouteManager";
import { NextFn, Context, Middleware } from "@/router/bridge/ContextAdapter";

export abstract class AbstractRouteAction implements IRouteAction {
    protected middlewares: Middleware[];
    protected routeMetadata: RouteMetadata;
    protected entityMetadata: EntityMetadata;

    constructor(args: RouteActionConstructorArgs & RouteActionConstructorData) {
        const { middlewares, routeMetadata, entityMetadata } = args;
        this.middlewares = middlewares;
        this.routeMetadata = routeMetadata;
        this.entityMetadata = entityMetadata;
    }

    abstract onRequest(ctx: Context, next: NextFn): Promise<any>;
}

export type RouteActionConstructorArgs = { middlewares: Middleware[] };
export type RouteActionConstructorData = { routeMetadata: RouteMetadata; entityMetadata: EntityMetadata };

export interface IRouteAction {
    onRequest: Function;
}

export type RouteActionClass<T extends object = object> = new (
    args?: RouteActionConstructorArgs,
    data?: T
) => IRouteAction;

export type RouteActionRouterConfigWithInstance<T = any> = {
    /** Existing router to pass on which custom actions routes will be registered */
    router: BridgeRouter<T>;
};
export type RouteActionRouterConfig<T = any> = RouteActionRouterConfigWithInstance<T> | EntityRouterFactoryOptions<T>;

export type BaseRouteAction = Omit<CrudAction, "method"> & {
    /** Custom operation for that action */
    operation?: RouteOperation;
    /** List of middlewares to be called (in the same order as defined here) */
    middlewares?: Middleware[];
};

export type RouteActionClassOptions = BaseRouteAction & {
    /** Class that implements IRouteAction, onRequest method will be called by default unless a method key is provided */
    class?: RouteActionClass;
    /** Method name of RouteAction class to call for this verb+path, mostly useful to re-use the same class for multiple actions */
    method?: string;
};

export type RouteActionFunctionOptions = BaseRouteAction & {
    /** Route handler (actually is a middleware) */
    handler?: Function;
};

export type RouteAction = RouteActionClassOptions | RouteActionFunctionOptions;
