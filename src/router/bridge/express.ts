import { Router, Request, Response, RequestHandler } from "express";

import { EntityRouteOptions } from "@/router/EntityRouter";
import { BridgeRouterRoute } from "@/router/bridge/BridgeRouter";
import { ContextAdapter } from "@/router/bridge/ContextAdapter";
import { MakeEntityRouters, makeEntityRouters } from "@/router/maker";

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

export type ExpressContextAdapter = ContextAdapter & { req: Request; res: Response };
type ECA = ExpressContextAdapter;

export const makeExpressContextAdapter = (req: Request, res: Response) =>
    ({
        req,
        res,
        get method() {
            return (this as ECA).req.method;
        },
        get requestBody() {
            return (this as ECA).req.body;
        },
        get params() {
            return (this as ECA).req.params;
        },
        get query() {
            return (this as ECA).req.query;
        },
        get state() {
            return (this as ECA).res.locals;
        },
        get responseBody() {
            return (this as ECA).res.locals.responseBody;
        },
        set responseBody(value: any) {
            (this as ECA).res.locals.responseBody = value;
            (this as ECA).res.send(value).end();
        },
        get status() {
            return (this as ECA).res.statusCode;
        },
        set status(value) {
            (this as ECA).res.status(value);
        },
    } as ExpressContextAdapter);
