import { Primitive } from "@/functions/primitives";
import { BridgeRouterRoute } from "@/router/bridge/BridgeRouter";
import { isEqualArrays } from "@/functions/array";

export const formatRoutePath = (path: string) => (path[0] === "/" ? path.slice(1) : path);

export const formatRouteName = (path: string, operation: string) =>
    (formatRoutePath(path) + "_" + operation).toLowerCase();

/**
 * Constistent way of parsing an array of queryString param
 * Solves the case where array.length is 1 and therefor value would not be in an array
 */
export const parseArrayQS = (query: Record<string, Primitive>, key: string) =>
    query[key + "[]"] ? (Array.isArray(query[key + "[]"]) ? query[key + "[]"] : [query[key + "[]"]]) : query[key];

export function areSameRoutes(routeA: BridgeRouterRoute, routeB: BridgeRouterRoute) {
    return (
        routeA.name === routeB.name || (routeA.path === routeB.path && isEqualArrays(routeA.methods, routeB.methods))
    );
}
