import * as Router from "koa-router";
import { Middleware, Context, Next } from "koa";
import { BridgeRouterRoute, printBridgeRoute } from "@/router/bridge/BridgeRouter";
import { MakeEntityRouters, makeEntityRouters } from "@/router/maker";
import { EntityRouteOptions } from "@/router/EntityRouter";
import { ContextAdapter } from "@/router/bridge/ContextAdapter";
import { QueryParams } from "@/filters/index";

export function registerKoaRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<Middleware>) {
    instance.register(route.path, route.methods, route.middlewares, { name: route.name });
}

export async function makeKoaEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters({
        ...args,
        options: {
            ...args.options,
            routerFactoryClass: Router,
            routerRegisterFn: registerKoaRouteFromBridgeRoute,
            middlewareAdapter: koaMwAdapter,
        },
    });
}

export type KoaContextAdapter = ContextAdapter<QueryParams> & { ctx: Context };
type KCA = KoaContextAdapter;

export const makeKoaContextAdapter = (ctx: Context) => ({
    ctx,
    req: ctx.req,
    res: ctx.res,
    get method() {
        return (this as KCA).ctx.method;
    },
    get requestBody() {
        return (this as KCA).ctx.request.body;
    },
    get params() {
        return (this as KCA).ctx.params;
    },
    get query() {
        return (this as KCA).ctx.query;
    },
    get state() {
        return (this as KCA).ctx.state;
    },
    get responseBody() {
        return (this as KCA).ctx.body;
    },
    set responseBody(value) {
        (this as KCA).ctx.body = value;
    },
    get status() {
        return (this as KCA).ctx.status;
    },
    set status(value) {
        (this as KCA).ctx.status = value;
    },
});

export const koaMwAdapter = (mw: Function) => (ctx: Context, next: Next) => mw(makeKoaContextAdapter(ctx), next);

export const getAppRoutes = (arr: Middleware[]) => {
    const returnRoute = (midw: Middleware) => {
        const formatRoute = (item: Router.Layer) => ({
            methods: item.methods,
            path: item.path,
            name: item.name,
            desc: printBridgeRoute(item as any),
        });
        const router: Router = (midw as any).router;
        return router?.stack.length && router.stack.map(formatRoute);
    };
    return arr.map(returnRoute).filter(Boolean);
};
