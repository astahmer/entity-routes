import { BridgeRouterRoute } from "@/router/bridge/BridgeRouter";
import { MakeEntityRouters, makeEntityRouters } from "@/router/maker";
import { EntityRouteOptions } from "@/router/EntityRouter";
import { ContextAdapter } from "@/router/bridge/ContextAdapter";
import { Router, Request, Response, RequestHandler } from "express";

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

type ResponseWithBody = Response & { body: any };
export type ExpressContextAdapter = ContextAdapter & { req: Request; res: ResponseWithBody };
type ECA = ExpressContextAdapter;

export const makeExpressContextAdapter = (req: Request, res: ResponseWithBody) => ({
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
    setState(key: string, value: any) {
        if (!this.state) this.state = {};
        (this as ECA).state[key] = value;
    },
    get responseBody() {
        return (this as ECA).res.body;
    },
    set responseBody(value: any) {
        (this as ECA).res.send(value).end();
    },
    get status() {
        return (this as ECA).res.statusCode;
    },
    set status(value) {
        (this as ECA).res.status(value);
    },
});
