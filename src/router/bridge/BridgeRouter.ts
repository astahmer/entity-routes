import {
    RouteActionRouterConfig,
    IRouteAction,
    RouteAction,
    RouteActionClassOptions,
} from "@/router/AbstractRouteAction";
import { formatRouteName } from "@/functions/route";
import { isType, isClass } from "@/functions/asserts";
import { CType } from "@/utils-types";
import { RouteVerb } from "@/router/RouteManager";
import { EntityRouterFactoryOptions } from "@/router/EntityRouter";

export class BridgeRouter<T = any> {
    readonly instance: T;
    readonly routes: BridgeRouterRoute[] = [];

    constructor(
        public readonly factory: BridgeRouterFactory<T>,
        private readonly registerFn: BridgeRouterRegisterFn<T>
    ) {
        this.instance = isClass(factory) ? new factory() : factory();
    }

    /** Create and register a route. */
    register(route: BridgeRouterRoute) {
        this.routes.push(route);
        this.registerFn(this.instance, route);
    }
}

export type BridgeRouterRoute<Mw = Function> = {
    name?: string;
    path: string;
    methods: RouteVerb[];
    middlewares: Mw[];
};
export type BridgeRouterFactory<T> = CType<T> | ((...args: any) => T);
export type BridgeRouterRegisterFn<T = any> = (instance: T, route: BridgeRouterRoute) => any;

export function makeRouterFromActions<Data extends object = object, T = any>(
    actions: RouteAction[],
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

export const getRouterFactory = <T = any>(config: EntityRouterFactoryOptions<T>) =>
    isType<EntityRouterFactoryOptions<T, "class">>(config, "routerFactoryClass" in config)
        ? config.routerFactoryClass
        : isType<EntityRouterFactoryOptions<T, "fn">>(config, "routerFactoryFn" in config)
        ? config.routerFactoryFn
        : null;
