import axios, { AxiosInstance } from "axios";
import { AddressInfo, Server } from "net";
import * as Koa from "koa";
import * as Router from "koa-router";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import * as bodyParser from "koa-bodyparser";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerKoaRouteFromBridgeRoute, makeKoaEntityRouters } from "@/router/bridge/koa";
import { testRouteConfigs, testRoute, TestRequestConfig } from "@@/tests/router/bridge/sample/requests";
import { User, Article, Comment, Upvote, expectedRouteNames } from "@@/tests/router/bridge/sample/entities";

describe("koa BridgeRouter adapter", () => {
    const entities = [User, Article, Comment, Upvote];

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
            const result = await setupApp(entities);
            server = result.server;
            client = result.client;
        });
        afterAll(() => {
            server.close();
            return closeTestConnection();
        });

        const makeTest = (config: TestRequestConfig) => it(config.it, () => testRoute(client, config));
        testRouteConfigs.forEach(makeTest);
    });
});

async function setupApp(entities: Function[]) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
    const app = new Koa();
    app.use(bodyParser());

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { server, client };
}
