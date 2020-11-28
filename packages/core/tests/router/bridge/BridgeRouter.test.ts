import {
    BridgeRouter,
    IRouteAction,
    koaMwAdapter,
    koaRouterFactory,
    makeRouterFromActions,
    registerKoaRouteFromBridgeRoute,
} from "@entity-routes/core";
import { Context } from "koa";

const noop = () => {};

describe("BridgeRouter", () => {
    it("can register route", () => {
        const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);
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
                    handler: (ctx: Context) => {
                        ctx.body = "Home page.";
                    },
                    middlewares: [noop],
                },
                {
                    path: "register",
                    operation: "create",
                    verb: "post",
                    class: class CustomRegisterClass implements IRouteAction {
                        onRequest(ctx: Context) {
                            ctx.body = "Creating user...";
                        }
                    },
                    middlewares: [noop],
                },
            ],
            {
                routerFactoryFn: koaRouterFactory,
                routerRegisterFn: registerKoaRouteFromBridgeRoute,
                middlewareAdapter: koaMwAdapter,
            }
        );

        expect(router.routes.map((r) => r.name)).toEqual(["home_list", "register_create"]);
    });

    it("makeRouterFromActions (using existing BridgeRouter)", () => {
        const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);
        makeRouterFromActions<any>(
            [
                {
                    path: "home",
                    operation: "list",
                    verb: "get",
                    handler: (ctx: Context) => {
                        ctx.body = "Home page.";
                    },
                    middlewares: [noop],
                },
                {
                    path: "register",
                    operation: "create",
                    verb: "post",
                    handler: (ctx: Context) => {
                        ctx.body = "Creating user...";
                    },
                    middlewares: [noop],
                },
            ],
            { router }
        );

        expect(router.routes.map((r) => r.name)).toEqual(["home_list", "register_create"]);
    });
});
