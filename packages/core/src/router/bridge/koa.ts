import {
    BridgeRouterRoute,
    ContextAdapter,
    EntityRouteOptions,
    MakeEntityRouters,
    QueryParams,
    makeEntityRouters,
    printBridgeRoute,
} from "@entity-routes/core";
import { Context, Middleware, Next } from "koa";
import Router from "koa-router";

export function registerKoaRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<Middleware>) {
    instance.register(route.path, route.methods, route.middlewares, { name: route.name });
}

export async function makeKoaEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters<typeof koaRouterFactory>({
        ...args,
        options: {
            ...args.options,
            routerFactoryFn: koaRouterFactory,
            routerRegisterFn: registerKoaRouteFromBridgeRoute,
            middlewareAdapter: koaMwAdapter,
        },
    });
}

export const koaRouterFactory = () => new Router();

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
