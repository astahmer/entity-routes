import { RouteDefaultOperation } from "@/decorators/Groups";
import { ROUTE_METAKEY, EntityRouteConfig } from "@/router/EntityRouter";

/**
 * @example
 *
 * [at]Pagination({ all: true })
 * [at]Search(["id", [name: "startsWith"]])
 * [at]EntityRoute({ path: "/users", operations: ["create", "list", "delete"] }, {
 *     actions: [
 *         {
 *             verb: "get",
 *             path: "/custom",
 *             class: CustomAction,
 *             middlewares: [
 *                 async function(ctx, next) {
 *                     console.log("before custom action");
 *                     await next();
 *                     console.log("after custom action");
 *                 },
 *             ],
 *         },
 *     ],
 * })
 */
export function EntityRoute(
    args: EntityRouteArgs = { operations: [] },
    options: EntityRouteConfig = {}
): ClassDecorator {
    return (target: Function) => {
        Reflect.defineMetadata(
            ROUTE_METAKEY,
            { path: args.path || "/" + target.name.toLowerCase(), operations: args.operations || [], options },
            target
        );
    };
}

export type EntityRouteArgs = { path?: string; operations?: RouteDefaultOperation[] };
