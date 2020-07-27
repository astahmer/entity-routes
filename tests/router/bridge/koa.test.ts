import { AxiosInstance } from "axios";
import { Server } from "net";
import * as Router from "koa-router";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerKoaRouteFromBridgeRoute, makeKoaEntityRouters } from "@/router/bridge/koa";
import { testRouteConfigs, testRoute, TestRequestConfig } from "@@/tests/router/bridge/sample/requests";
import { getTestEntities, expectedRouteNames } from "@@/tests/router/bridge/sample/entities";
import { setupKoaApp } from "@@/tests/router/bridge/koaSetup";
import { resetHooksCalled, testHooksConfigs, makeTestFn } from "./sample/hooks";

describe("koa BridgeRouter adapter", () => {
    const entities = getTestEntities();

    it("registerKoaRouteFromBridgeRouter", () => {
        const koaRouter = new Router();
        const path = "/test_path";
        const methods = ["get", "post"] as RouteVerb[];

        registerKoaRouteFromBridgeRoute(koaRouter, { path, methods, middlewares: [(_ctx) => {}] });

        expect(koaRouter.stack.length).toEqual(1);
        expect(koaRouter.stack[0].path).toEqual(path);
        expect(koaRouter.stack[0].methods).toContainValues(methods.map((item) => item.toUpperCase()));
    });

    it("makeKoaEntityRouters", async () => {
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const koaRouters = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            koaRouters,
            (router) => router.stack,
            (route) => route.name
        );

        expect(routeNames).toEqualMessy(
            flatMapOnProp(
                bridgeRouters,
                (router) => router.routes,
                (route) => route.name
            )
        );
        expect(routeNames).toEqualMessy(expectedRouteNames);

        return closeTestConnection();
    });

    describe("integrates properly with koa server", () => {
        let server: Server, client: AxiosInstance;
        beforeAll(async () => {
            const result = await setupKoaApp(entities);
            server = result.server;
            client = result.client;
        });
        afterAll(() => {
            server.close();
            return closeTestConnection();
        });

        const makeTest = (config: TestRequestConfig) =>
            (config.only ? it.only : config.skip ? it.skip : it)(config.it, async () => {
                try {
                    await testRoute(client, config);
                } catch (error) {
                    console.error(error.message);
                }
            });
        testRouteConfigs.forEach(makeTest);
    });

    describe("invokes hooks in the right order", () => {
        beforeEach(resetHooksCalled);

        const makeTest = makeTestFn(setupKoaApp, entities);

        testHooksConfigs.forEach((config) =>
            (config.only ? it.only : config.skip ? it.skip : it)(
                `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
                () => makeTest(config)
            )
        );
    });
});
