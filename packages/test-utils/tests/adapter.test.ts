import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { BridgeRouterRoute, CRUD_OPERATIONS, EntityRoute, flatMapOnProp } from "@entity-routes/core";

import {
    TestMiddleware,
    createTestConnection,
    createTestRouter,
    makeTestEntityRouters,
    registerTestRouteFromBridgeRoute,
} from "../src";

describe("adapter", () => {
    it("registerTestRouteFromBridgeRoute", () => {
        const router = createTestRouter();
        const route1: BridgeRouterRoute<TestMiddleware> = {
            methods: ["get"],
            middlewares: [],
            path: "/123",
            name: "test_route1",
        };
        const route2: BridgeRouterRoute<TestMiddleware> = {
            methods: ["get"],
            middlewares: [],
            path: "/456",
            name: "test_route2",
        };

        const configs = [route1, route2];
        configs.forEach((route) => registerTestRouteFromBridgeRoute(router, route));

        const expectedRouteNames = configs.map((route) => route.name);
        expect(router.getAll().map((route) => route.name)).toEqual(expectedRouteNames);
    });

    it("makeTestEntityRouters", async () => {
        @EntityRoute({ operations: CRUD_OPERATIONS })
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: number;

            @Column()
            name: string;
        }

        const entities = [User];
        const connection = await createTestConnection(entities);

        const bridgeRouters = await makeTestEntityRouters({ connection, entities });
        const routers = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            routers,
            (router) => router.getAll(),
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
            "user_list",
            "user_list_mapping",
            "user_details",
            "user_details_mapping",
            "user_create",
            "user_create_mapping",
            "user_update",
            "user_update_mapping",
            "user_delete",
        ]);
    });
});
