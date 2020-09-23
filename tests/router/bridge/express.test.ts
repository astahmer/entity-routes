import { AxiosInstance } from "axios";
import { Server } from "net";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Router } from "express";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerExpressRouteFromBridgeRoute, makeExpressEntityRouters, printBridgeRoute } from "@/router/bridge/index";
import { testRouteConfigs, TestRequestConfig, testRoute } from "@@/tests/router/bridge/sample/requests";
import { getTestEntities, expectedRouteDesc } from "@@/tests/router/bridge/sample/entities";
import { setupExpressApp } from "@@/tests/router/bridge/expressSetup";
import { resetHooksCalled, makeTestFn, testHooksConfigs } from "./sample/hooks";

describe("Express BridgeRouter adapter", () => {
    const entities = getTestEntities();

    it("registerExpressRouteFromBridgeRouter", () => {
        const router = Router();
        const path = "/test_path";
        const methods = ["get", "post"] as RouteVerb[];

        registerExpressRouteFromBridgeRoute(router, { path, methods, middlewares: [(_ctx) => {}] });

        expect(router.stack.length).toEqual(2);
        expect(router.stack[0].route).toMatchObject({ path, methods: { [methods[0]]: true } });
        expect(router.stack[1].route).toMatchObject({ path, methods: { [methods[1]]: true } });
    });

    it("makeExpressEntityRouters", async () => {
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeExpressEntityRouters({ connection, entities });
        const routers = (bridgeRouters.map((bridge) => bridge.instance) as any) as Router[];

        const routePaths = flatMapOnProp(
            routers,
            (router) => router.stack,
            (layer) => layer.route.path
        );

        expect(routePaths).toEqual(
            flatMapOnProp(
                bridgeRouters,
                (router) => router.routes,
                (route) => route.path
            )
        );
        const routeDescs = flatMapOnProp(
            bridgeRouters,
            (router) => router.routes,
            (route) => printBridgeRoute(route)
        );

        expect(routeDescs).toEqual(expectedRouteDesc);

        return closeTestConnection();
    });

    describe("integrates properly with Express server", () => {
        let server: Server, client: AxiosInstance;
        beforeAll(async () => {
            const result = await setupExpressApp(entities);
            server = result.server;
            client = result.client;
        });
        afterAll(() => {
            server.close();
            return closeTestConnection();
        });

        const makeTest = (config: TestRequestConfig) => {
            (config.only ? it.only : config.skip ? it.skip : it)(config.it, () => testRoute(client, config));
        };

        testRouteConfigs.forEach(makeTest);
    });

    describe("invokes hooks in the right order", () => {
        beforeEach(resetHooksCalled);

        const makeTest = makeTestFn(setupExpressApp, entities);

        testHooksConfigs.forEach((config) =>
            (config.only ? it.only : config.skip ? it.skip : it)(
                `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
                () => makeTest(config)
            )
        );
    });
});
