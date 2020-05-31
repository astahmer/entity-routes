import * as Router from "koa-router";
import { Middleware } from "koa";
import { BridgeRouterRoute } from "@/bridges/routers/BridgeRouter";
import { MakeEntityRouters, makeEntityRouters } from "@/router/maker";
import { EntityRouteOptions } from "@/router/EntityRouter";

export function registerKoaRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute) {
    return instance.register(route.path, route.methods, route.middlewares, { name: route.name });
}

export async function makeKoaEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters({
        ...args,
        options: { ...args.options, routerClass: Router, routerRegisterFn: registerKoaRouteFromBridgeRoute },
    });
}

export const getAppRoutes = (arr: Middleware[]) => {
    const returnRoute = (midw: Middleware) => {
        const formatRoute = (item: Router.Layer) => ({
            methods: item.methods,
            path: item.path,
            name: item.name,
            desc: item.methods.join(",") + " : " + item.path,
        });
        const router: Router = (midw as any).router;
        return router && router.stack.length && router.stack.map(formatRoute);
    };
    return arr.map(returnRoute).filter(Boolean);
};
