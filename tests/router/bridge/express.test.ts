import axios, { AxiosInstance } from "axios";
import { AddressInfo, Server } from "net";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Router } from "express";
import * as express from "express";
import * as bodyParser from "body-parser";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerExpressRouteFromBridgeRoute, makeExpressEntityRouters, printBridgeRoute } from "@/router/bridge/index";
import { testRouteConfigs, TestRequestConfig, testRoute } from "@@/tests/router/bridge/sample/requests";
import { getTestEntities, expectedRouteDesc } from "@@/tests/router/bridge/sample/entities";

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
            const result = await setupApp(entities);
            server = result.server;
            client = result.client;
        });
        afterAll(() => {
            server.close();
            return closeTestConnection();
        });

        const makeTest = (config: TestRequestConfig) => {
            it(config.it, async () => {
                try {
                    await testRoute(client, config);
                } catch (error) {
                    console.error(error.message);
                }
            });
        };

        testRouteConfigs.forEach(makeTest);
    });
});

async function setupApp(entities: Function[]) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeExpressEntityRouters({ connection, entities });
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Register all routes on Express server
    bridgeRouters.forEach((router) => app.use(router.instance));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { server, client };
}
