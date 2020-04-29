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
export const EntityRoute = (
    path: string,
    operations: RouteDefaultOperation[] = [],
    options: EntityRouteOptions = {}
): ClassDecorator => {
    return (target: Function) => {
        Reflect.defineMetadata(ROUTE_METAKEY, { path, operations, options }, target);
    };
};
