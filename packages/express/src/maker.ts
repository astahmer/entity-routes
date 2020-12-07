import { RequestHandler, Router } from "express";

import { BridgeRouterRoute, EntityRouteOptions, MakeEntityRouters, makeEntityRouters } from "@entity-routes/core";

import { makeExpressContextAdapter } from "./adapter";

export function registerExpressRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<RequestHandler>) {
    route.methods.forEach((verb) => instance[verb](route.path, route.middlewares));
}

export async function makeExpressEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters({
        ...args,
        options: {
            ...args.options,
            routerFactoryFn: Router,
            routerRegisterFn: registerExpressRouteFromBridgeRoute,
            middlewareAdapter: (mw: Function) => (req, res, next) => mw(makeExpressContextAdapter(req, res), next),
        },
    });
}
