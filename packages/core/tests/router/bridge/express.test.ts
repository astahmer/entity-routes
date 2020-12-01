import { Server } from "net";

import {
    RouteVerb,
    flatMapOnProp,
    makeExpressEntityRouters,
    printBridgeRoute,
    registerExpressRouteFromBridgeRoute,
} from "@entity-routes/core";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";
import { AxiosInstance } from "axios";
import { Router } from "express";

import { setupExpressApp } from "./expressSetup";
import { expectedRouteDesc, getTestEntities } from "./sample/entities";
import { makeTestFn, resetHooksCalled, testHooksConfigs } from "./sample/hooks";
import { TestRequestConfig, testRoute, testRouteConfigs } from "./sample/requests";

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

        expect(routeDescs).toEqualMessy(expectedRouteDesc);

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
