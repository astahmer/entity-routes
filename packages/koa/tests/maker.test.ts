import { AddressInfo, Server } from "net";

import axios, { AxiosInstance } from "axios";
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { EntityRouteOptions, RouteVerb } from "@entity-routes/core";
import { Router, makeKoaEntityRouters, registerKoaRouteFromBridgeRoute } from "@entity-routes/koa";
import {
    TestRequestConfig,
    expectedRouteNames,
    getTestEntities,
    makeTestFn,
    resetHooksCalled,
    testHooksConfigs,
    testRoute,
    testRouteConfigs,
} from "@entity-routes/sample";
import { flatMapOnProp } from "@entity-routes/shared";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";

async function setupTestKoaApp(entities: Function[], options?: EntityRouteOptions) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeKoaEntityRouters({ connection, entities, options });
    const app = new Koa();
    app.use(bodyParser());

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}

describe("Koa integration", () => {
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

        const bridgeRouters = await makeKoaEntityRouters({
            connection,
            entities,
            options: { defaultWriterOptions: { shouldSetSubresourcesIriOnItem: true } },
        });
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
            const result = await setupTestKoaApp(entities);
            server = result.server;
            client = result.client;
        });
        afterAll(() => {
            server.close();
            return closeTestConnection();
        });

        const makeTest = (config: TestRequestConfig) =>
            (config.only ? it.only : config.skip ? it.skip : it)(config.it, () => testRoute(client, config));
        testRouteConfigs.forEach(makeTest);
    });

    describe("invokes hooks in the right order", () => {
        beforeEach(resetHooksCalled);

        const makeTest = makeTestFn(setupTestKoaApp, entities);

        testHooksConfigs.forEach((config) =>
            (config.only ? it.only : config.skip ? it.skip : it)(
                `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
                () => makeTest(config)
            )
        );
    });
});
