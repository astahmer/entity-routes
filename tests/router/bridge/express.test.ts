import axios from "axios";
import { AddressInfo } from "net";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { log } from "@/functions/utils";
import { Router } from "express";
import * as express from "express";
import * as bodyParser from "body-parser";
import { User } from "@@/tests/router/bridge/sample/entities";
import { RouteVerb, flatMapOnProp } from "@/index";
import { registerExpressRouteFromBridgeRoute, makeExpressEntityRouters } from "@/router/bridge/index";
import { testRestRoutes } from "@@/tests/router/bridge/sample/requests";

describe("Express BridgeRouter adapter", () => {
    const entities = [User];

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
            (route) => `${route.methods.join(",")}:${route.path}`
        );

        expect(routeDescs).toEqual(["post:/user", "post:/user/mapping", "get:/user", "get:/user/mapping"]);

        return closeTestConnection();
    });

    it("integrates properly with Express server", async () => {
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeExpressEntityRouters({ connection, entities });
        const app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Register all routes on Express server
        bridgeRouters.forEach((router) => app.use(router.instance));

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
