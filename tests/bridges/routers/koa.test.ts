import * as Koa from "koa";
import * as Router from "koa-router";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import {
    registerKoaRouteFromBridgeRoute,
    makeKoaEntityRouters,
    EntityRoute,
    getAppRoutes,
    flatMapOnProp,
} from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";

describe("koa BridgeRouter adapter", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    @EntityRoute({ operations: ["create", "list"] })
    @Entity()
    class User extends AbstractEntity {
        @Column()
        name: string;
    }

    const entities = [User];

    it("registerKoaRouteFromBridgeRouter", () => {
        const koaRouter = new Router();
        const path = "/test_path";
        const methods = ["get", "post"];

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

    it("integrates properly with koa server", async () => {
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
});
