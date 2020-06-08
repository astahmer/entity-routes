import { isType, isClass } from "@/functions/asserts";
import { CType } from "@/utils-types";
import { RouteVerb } from "@/router/MiddlewareMaker";
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

export const getRouterFactory = <T = any>(config: EntityRouterFactoryOptions<T>) =>
    isType<EntityRouterFactoryOptions<T, "class">>(config, "routerFactoryClass" in config)
        ? config.routerFactoryClass
        : isType<EntityRouterFactoryOptions<T, "fn">>(config, "routerFactoryFn" in config)
        ? config.routerFactoryFn
        : null;
