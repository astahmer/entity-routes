import { EntityRouteOptions, ROUTE_METAKEY } from "@/services/EntityRouter";
import { RouteDefaultOperation } from "@/decorators/Groups";

/**
 * @example
 *
 * [at]PaginationFilter([], { all: true })
 * [at]SearchFilter(["id", { name: "startsWith" }])
 * [at]EntityRoute("/users", ["create", "list", "details", "update", "delete"], {
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
    options: EntityRouteOptions = {}
): ClassDecorator {
    return (target: Function) => {
        Reflect.defineMetadata(
            ROUTE_METAKEY,
            { path: args.path || target.name, operations: args.operations || [], options },
            target
        );
    };
}

export type EntityRouteArgs = { path?: string; operations: RouteDefaultOperation[] };
