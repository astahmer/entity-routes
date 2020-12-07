import { AddressInfo, Server } from "net";

import axios, { AxiosInstance } from "axios";
import bodyParser from "body-parser";
import express, { Router } from "express";

import { EntityRouteOptions, RouteVerb, printBridgeRoute } from "@entity-routes/core";
import { makeExpressEntityRouters, registerExpressRouteFromBridgeRoute } from "@entity-routes/express";
import {
    TestRequestConfig,
    expectedRouteDesc,
    getTestEntities,
    makeTestFn,
    resetHooksCalled,
    testHooksConfigs,
    testRoute,
    testRouteConfigs,
} from "@entity-routes/sample";
import { flatMapOnProp } from "@entity-routes/shared";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";

export async function setupTestExpressApp(entities: Function[], options?: EntityRouteOptions) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeExpressEntityRouters({ connection, entities, options });
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Register all routes on Express server
    bridgeRouters.forEach((router) => app.use(router.instance));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}

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

        expect(routePaths).toEqualMessy(
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
            const result = await setupTestExpressApp(entities);
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

        const makeTest = makeTestFn(setupTestExpressApp, entities);

        testHooksConfigs.forEach((config) =>
            (config.only ? it.only : config.skip ? it.skip : it)(
                `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
                () => makeTest(config)
            )
        );
    });
});
