import { RouteOperation } from "../../decorators";
import { areSameRoutes, isDev } from "../../functions";
import { AnyFunction } from "../../utils-types";
import { SubresourceRelation } from "../SubresourceMaker";
import { RouteVerb } from "..";

export class BridgeRouter<T = any> {
    readonly instance: T;
    readonly routes: BridgeRouterRoute[] = [];

    constructor(public readonly factory: AnyFunction<T>, private readonly registerFn: BridgeRouterRegisterFn<T>) {
        this.instance = factory();
    }

    /** Create and register a route. */
    register(route: BridgeRouterRoute) {
        if (this.routes.find((registered) => areSameRoutes(registered, route))) {
            isDev() && console.warn("This route is already registered on that router", route);
            return;
        }

        this.routes.push(route);
        this.registerFn(this.instance, route);
    }
}

export type BridgeRouterRoute<Mw = Function> = {
    name?: string;
    path: string;
    methods: RouteVerb[];
    middlewares: Mw[];
    operation?: RouteOperation;
    subresources?: Array<SubresourceRelation & { path: string }>;
};
export type BridgeRouterRegisterFn<T = any> = (instance: T, route: BridgeRouterRoute) => any;

export const printBridgeRoute = (route: BridgeRouterRoute) => route.path + " : " + route.methods.join(",");
