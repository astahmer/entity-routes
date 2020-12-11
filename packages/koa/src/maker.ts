import { Context, Middleware, Next } from "koa";
import Router from "koa-router";

import { BridgeRouterRoute, EntityRouteOptions, MakeEntityRouters, makeEntityRouters } from "@entity-routes/core";

import { makeKoaContextAdapter } from "./adapter";

// Re-exports koa/koa-router most used types
export { Context, Middleware, Next, Router };

export function registerKoaRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<Middleware>) {
    instance.register(route.path, route.methods, route.middlewares, { name: route.name });
}

export type MakeKoaEntityRoutersArgs = Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions };
export const makeKoaEntityRouters = (args: MakeKoaEntityRoutersArgs) =>
    makeEntityRouters<typeof koaRouterFactory>({ ...args, options: { ...args.options, ...koaRouterFactoryOptions } });

export const koaRouterFactory = () => new Router();
export const koaMwAdapter = (mw: Function) => (ctx: Context, next: Next) => mw(makeKoaContextAdapter(ctx), next);
export const koaRouterFactoryOptions = {
    routerFactoryFn: koaRouterFactory,
    routerRegisterFn: registerKoaRouteFromBridgeRoute,
    middlewareAdapter: koaMwAdapter,
};
