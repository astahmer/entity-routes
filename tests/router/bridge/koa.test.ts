import axios, { AxiosInstance } from "axios";
import { AddressInfo, Server } from "net";
import * as Koa from "koa";
import * as Router from "koa-router";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import * as bodyParser from "koa-bodyparser";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerKoaRouteFromBridgeRoute, makeKoaEntityRouters, getAppRoutes } from "@/router/bridge/koa";
import { User, Article, Comment } from "@@/tests/router/bridge/sample/entities";
import { testRouteConfigs, testRoute, TestRequestConfig } from "@@/tests/router/bridge/sample/requests";

describe("koa BridgeRouter adapter", () => {
    const entities = [User, Article, Comment];

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
        expect(routeNames).toEqualMessy([
            "user_create",
            "user_create_mapping",
            "user_details",
            "user_details_mapping",
            "user_list",
            "user_list_mapping",
            "user_articles_create",
            "user_articles_list",
            "user_articles_delete",
            "user_articles_comments_list",
            "article_details",
            "article_details_mapping",
            "article_comments_create",
            "article_comments_list",
            "article_comments_delete",
        ]);

        return closeTestConnection();
    });

    it("registers routes on koa server", async () => {
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const app = new Koa();

        // Register all routes on koa server
        bridgeRouters.forEach((router) => app.use(router.instance.routes()));

        const appRoutes = getAppRoutes(app.middleware);
        const routeNames = flatMapOnProp(
            appRoutes,
            (route) => route,
            (route) => route.name
        );
        expect(routeNames).toEqualMessy([
            "user_create",
            "user_create_mapping",
            "user_details",
            "user_details_mapping",
            "user_list",
            "user_list_mapping",
            "user_articles_create",
            "user_articles_list",
            "user_articles_delete",
            "user_articles_comments_list",
            "article_details",
            "article_details_mapping",
            "article_comments_create",
            "article_comments_list",
            "article_comments_delete",
        ]);

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
