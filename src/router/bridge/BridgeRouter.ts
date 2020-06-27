import { isType, isClass, isDev } from "@/functions/asserts";
import { CType } from "@/utils-types";
import { RouteVerb } from "@/router/MiddlewareMaker";
import { EntityRouterFactoryOptions } from "@/router/EntityRouter";
import { isEqualArrays } from "@/functions/array";

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
        if (this.routes.find((registered) => this.areSameRoutes(registered, route))) {
            isDev() && console.warn("This route is already registered on that router", route);
            return;
        }

        this.routes.push(route);
        this.registerFn(this.instance, route);
    }

    private areSameRoutes(routeA: BridgeRouterRoute, routeB: BridgeRouterRoute) {
        return (
            routeA.name === routeB.name ||
            (routeA.path === routeB.path && isEqualArrays(routeA.methods, routeB.methods))
        );
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

export const getRouterFactory = <T = any>(config: EntityRouterFactoryOptions<T>) =>
    isType<EntityRouterFactoryOptions<T, "class">>(config, "routerFactoryClass" in config)
        ? config.routerFactoryClass
        : isType<EntityRouterFactoryOptions<T, "fn">>(config, "routerFactoryFn" in config)
        ? config.routerFactoryFn
        : null;

export const printBridgeRoute = (route: BridgeRouterRoute) => route.path + " : " + route.methods.join(",");
