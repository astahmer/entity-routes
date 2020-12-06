import { BridgeRouter, IRouteAction, makeRouterFromActions } from "@entity-routes/core";
import { TestContext, testRouterFactoryOptions } from "@entity-routes/test-utils";

const noop = () => {};

describe("BridgeRouter", () => {
    it("can register route", () => {
        const router = new BridgeRouter(
            testRouterFactoryOptions.routerFactoryFn,
            testRouterFactoryOptions.routerRegisterFn
        );
        router.register({ name: "home", path: "/home", methods: ["get", "post"], middlewares: [noop] });

        expect(router.routes.length).toEqual(1);
        expect(router.routes[0].name).toEqual("home");
    });

    it("makeRouterFromActions (new BridgeRouter)", () => {
        const router = makeRouterFromActions(
            [
                {
                    path: "home",
                    operation: "list",
                    verb: "get",
                    handler: (ctx: TestContext) => {
                        ctx.responseBody = "Home page.";
                    },
                    middlewares: [noop],
                },
                {
                    path: "register",
                    operation: "create",
                    verb: "post",
                    class: class CustomRegisterClass implements IRouteAction {
                        onRequest(ctx: TestContext) {
                            ctx.responseBody = "Creating user...";
                        }
                    },
                    middlewares: [noop],
                },
            ],
            testRouterFactoryOptions
        );

        expect(router.routes.map((r) => r.name)).toEqual(["home_list", "register_create"]);
    });

    it("makeRouterFromActions (using existing BridgeRouter)", () => {
        const router = new BridgeRouter(
            testRouterFactoryOptions.routerFactoryFn,
            testRouterFactoryOptions.routerRegisterFn
        );
        makeRouterFromActions<any>(
            [
                {
                    path: "home",
                    operation: "list",
                    verb: "get",
                    handler: (ctx: TestContext) => {
                        ctx.responseBody = "Home page.";
                    },
                    middlewares: [noop],
                },
                {
                    path: "register",
                    operation: "create",
                    verb: "post",
                    handler: (ctx: TestContext) => {
                        ctx.responseBody = "Creating user...";
                    },
                    middlewares: [noop],
                },
            ],
            { router }
        );

        expect(router.routes.map((r) => r.name)).toEqual(["home_list", "register_create"]);
    });
});
