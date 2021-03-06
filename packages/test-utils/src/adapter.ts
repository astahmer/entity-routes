import {
    BridgeRouterRoute,
    ContextAdapter,
    EntityRouteOptions,
    MakeEntityRouters,
    QueryParams,
    makeEntityRouters,
} from "@entity-routes/core";

import { TestContext } from "./context";
import { TestRouter, createTestRouter } from "./router";
import { Method, TestMiddleware } from "./server";

export function registerTestRouteFromBridgeRoute(router: TestRouter, route: BridgeRouterRoute<TestMiddleware>) {
    route.methods.forEach((verb) => router.register({ method: verb.toUpperCase() as Method, ...route }));
}

export async function makeTestEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters({
        ...args,
        options: {
            ...args.options,
            routerFactoryFn: createTestRouter,
            routerRegisterFn: registerTestRouteFromBridgeRoute,
            middlewareAdapter: makeTestAdapter,
        },
    });
}

export const makeTestAdapter = (mw: Function): TestMiddleware => (ctx, next) => mw(makeTestContextAdapter(ctx), next);
export const testRouterFactoryOptions = {
    routerFactoryFn: createTestRouter,
    routerRegisterFn: registerTestRouteFromBridgeRoute,
    middlewareAdapter: makeTestAdapter,
};

interface WithContext {
    ctx: TestContext;
}
export interface TestContextAdapter extends ContextAdapter<QueryParams>, WithContext {}

export const makeTestContextAdapter = (ctx: TestContext) => new TestContextAdapter(ctx);
export class TestContextAdapter {
    req: TestContext["req"];
    res: TestContext["res"];
    constructor(public ctx: TestContext) {
        this.req = ctx.req;
        this.res = ctx.res;
    }

    get method() {
        return this.req.method;
    }
    get requestBody() {
        return this.ctx.requestBody;
    }
    get params() {
        return this.ctx.params;
    }
    get query() {
        const query: QueryParams = {};
        this.ctx.searchParams.forEach((value, key) => (query[key] = value));
        return query;
    }
    get state() {
        return this.ctx.state;
    }
    get responseBody() {
        return this.ctx.responseBody;
    }
    set responseBody(value: any) {
        this.ctx.responseBody = value;
    }
    get status() {
        return this.res.statusCode;
    }
    set status(value) {
        this.res.statusCode = value;
    }
}
