import { EntityMetadata } from "typeorm";

import { RouteOperation } from "@/decorators/Groups";
import { RouteMetadata, EntityRouterFactoryOptions } from "@/router/EntityRouter";
import { BridgeRouter, getRouterFactory } from "@/router/bridge/BridgeRouter";
import { CrudAction } from "@/router/MiddlewareMaker";
import { Middleware } from "@/router/bridge/ContextAdapter";
import { formatRouteName } from "@/functions/route";
import { isType } from "@/functions/asserts";

export function makeRouterFromActions<Data extends object = object, T = any>(
    actions: RouteActionConfig[],
    config: RouteActionRouterConfig<T>,
    data?: Data
) {
    const router =
        "router" in config ? config.router : new BridgeRouter(getRouterFactory(config), config.routerRegisterFn as any);

    if (!config) {
        throw new Error(
            "You have to provide a router class/fn factory in the [routerFactoryClass|routerFactoryFn] keys or an existing router with the [router] key"
        );
    }

    actions.forEach((item) => {
        const { verb, path, middlewares, operation } = item;
        const name = formatRouteName(path, operation);
        let customActionMw;

        if (isType<RouteActionClassOptions>(item, "class" in item)) {
            const { method, class: actionClass, middlewares } = item;
            const instance = new actionClass({ middlewares, ...data });
            const methodProp = (method as keyof IRouteAction) || "onRequest";

            customActionMw = instance[methodProp].bind(instance);
        } else {
            customActionMw = item.handler;
        }

        router.register({ path, name, methods: [verb], middlewares: [...(middlewares || []), customActionMw] });
    });

    return router;
}

export type RouteActionConstructorArgs = { middlewares: Middleware[] };
export type RouteActionConstructorData = { routeMetadata: RouteMetadata; entityMetadata: EntityMetadata };

export interface IRouteAction {
    onRequest: Function;
}

export type RouteActionClassCtor<T extends object = object> = new (
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
    class?: RouteActionClassCtor;
    /** Method name of RouteAction class to call for this verb+path, mostly useful to re-use the same class for multiple actions */
    method?: string;
};

export type RouteActionFunctionOptions = BaseRouteAction & {
    /** Route handler (actually is a middleware) */
    handler?: Function;
};

export type RouteActionConfig = RouteActionClassOptions | RouteActionFunctionOptions;
