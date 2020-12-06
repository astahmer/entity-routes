import { compose } from "./compose";
import { Method, RouteConfig, TestMiddleware } from "./server";

// Router inspired from https://gist.github.com/sc0ttj/9c23f604f3a906b32f7d355a793312b1
export function createTestRouter(): TestRouter {
    const routes: Record<Method, Record<string, RouteConfig>> = { GET: {}, POST: {}, PUT: {}, PATCH: {}, DELETE: {} };

    const register = (config: RouteConfig) => (routes[config.method][config.path] = config);
    const make = (): TestMiddleware => async (ctx, next) => {
        const method = ctx.req.method as Method;
        const path = ctx.url.pathname;
        const pattern = getRoutePatternFromPath(path, Object.keys(routes[method]));
        if (!pattern) return next();

        const config = routes[method][pattern];
        ctx.params = getRouteParams(pattern, path);

        return compose(config.middlewares)(ctx, next);
    };
    const list = () => routes;
    const getAll = (): RouteConfig[] =>
        Object.values(routes).reduce((acc, routesByMethod) => acc.concat(Object.values(routesByMethod)), []);

    return { make, register, list, getAll };
}

export type TestRouter = {
    make: () => TestMiddleware;
    register: (config: RouteConfig) => RouteConfig;
    list: () => Record<Method, Record<string, RouteConfig>>;
    getAll: () => RouteConfig[];
};

export const isPathMatchingPattern = (path: string, pattern: string) => !!path.match(routeToRegExp(pattern));
/** Converts "/profile/1" to "/profile/:id" */
export const getRoutePatternFromPath = (path: string, routes: string[]) =>
    // routes.find((route) => route === path) ||
    routes.find((route) => isPathMatchingPattern(path, route));

/**
 * Converts "/page/:id/user/:id" to a regex, returns the regex
 * @see (from Backbone.js, via https://gist.github.com/gcpantazis/5631831)
 */
export const routeToRegExp = (pattern: string) => {
    const optionalParam = /\((.*?)\)/g,
        namedParam = /(\(\?)?:\w+/g,
        splatParam = /\*\w+/g,
        escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

    const route = pattern
        .replace(escapeRegExp, "\\$&")
        .replace(optionalParam, "(?:$1)?")
        .replace(namedParam, function (match, optional) {
            return optional ? match : "([^/]+)";
        })
        .replace(splatParam, "(.*?)");

    return new RegExp("^" + route + "$");
};

/**  Checks if the given URL path matches the given route pattern, using regex produced by routeToRegExp */
export const getRouteParams = (pattern: string, path: string) => {
    // get an array of the params in the route pattern [ ":id", ":tabId", ... ]
    const paramKeys = pattern.split("/").filter((i) => i.replace(":", "") !== i);

    // get an array the parameters from the URL (/profile/1/tab/3)
    const paramValues = path.split("/").slice(2);

    // map the keys from the route pattern to the values from the URL
    const params: Record<string, string> = {};
    paramKeys.map((key, i) => (params[key.replace(":", "")] = paramValues[i]));

    return params;
};
