import axios from "axios";
import { AddressInfo } from "net";
import * as Koa from "koa";
import * as Router from "koa-router";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import * as bodyParser from "koa-bodyparser";
import { log } from "@/functions/utils";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerKoaRouteFromBridgeRoute, makeKoaEntityRouters, getAppRoutes } from "@/router/bridge/koa";
import { User } from "@@/tests/router/bridge/sample/entities";
import { testRestRoutes } from "@@/tests/router/bridge/sample/requests";

describe("koa BridgeRouter adapter", () => {
    const entities = [User];

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

        expect(routeNames).toEqual(
            flatMapOnProp(
                bridgeRouters,
                (router) => router.routes,
                (route) => route.name
            )
        );
        expect(routeNames).toEqual(["user_create", "user_create_mapping", "user_list", "user_list_mapping"]);

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
        expect(routeNames).toEqual(["user_create", "user_create_mapping", "user_list", "user_list_mapping"]);

        return closeTestConnection();
    });

    it("integrates properly with koa server", async () => {
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const app = new Koa();
        app.use(bodyParser());

        // Register all routes on koa server
        bridgeRouters.forEach((router) => app.use(router.instance.routes()));

        const server = app.listen(); // random port
        const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const request = axios.create({ baseURL });

        try {
            await testRestRoutes(request);
        } catch (error) {
            console.error(error.message);
        }

        server.close();
        return closeTestConnection();
    });
});
