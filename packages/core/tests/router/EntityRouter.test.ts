import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

import { EntityRoute, EntityRouter } from "@entity-routes/core";
import { ObjectLiteral, flatMapOnProp } from "@entity-routes/shared";
import {
    TestContext,
    closeTestConnection,
    createTestConnection,
    makeTestEntityRouters,
    setupTestApp,
} from "@entity-routes/test-utils";

describe("EntityRouter", () => {
    it("can retrieve all routers", () => {
        const entityRouters = EntityRouter.getAll();
        expect(entityRouters).toEqual({});
    });

    it("has registered routes", async () => {
        class AbstractEntity {
            @PrimaryGeneratedColumn()
            id: number;
        }

        @EntityRoute()
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;
        }

        const entities = [Role, User];
        await createTestConnection(entities);

        await makeTestEntityRouters({ entities });

        const entityRouters = EntityRouter.getAll();
        expect(Object.keys(entityRouters)).toEqual(["Role", "User"]);

        return closeTestConnection();
    });

    it("generates no routes when no params given", async () => {
        @EntityRoute()
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string;

            @Column()
            username: string;
        }
        const entities = [User];
        await createTestConnection(entities);
        const bridgeRouters = await makeTestEntityRouters({ entities });
        const routers = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            routers,
            (router) => router.getAll(),
            (route) => route.name
        );
        expect(routeNames).toEqual([]);

        closeTestConnection();
    });

    it("generates routes at path", async () => {
        @EntityRoute(
            { path: "/app_users", operations: ["create", "list"] },
            {
                actions: [
                    {
                        path: "/admin",
                        operation: "retrieveAdmin",
                        verb: "get",
                        name: "retrieve_admin",
                        handler: () => {},
                    },
                ],
            }
        )
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string;

            @Column()
            username: string;
        }

        const entities = [User];
        await createTestConnection(entities);
        const bridgeRouters = await makeTestEntityRouters({ entities });
        const routers = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            routers,
            (router) => router.getAll(),
            (route) => route.name
        );
        expect(routeNames).toEqualMessy([
            "user_create",
            "user_create_mapping",
            "user_list",
            "user_list_mapping",
            "retrieve_admin",
        ]);
        closeTestConnection();
    });

    it("generates restore route when softDeletion is allowed", async () => {
        @EntityRoute({ operations: ["delete"] }, { allowSoftDelete: true })
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string;

            @DeleteDateColumn()
            deletedAt: Date;

            @Column()
            username: string;
        }

        const entities = [User];
        await createTestConnection(entities);
        const bridgeRouters = await makeTestEntityRouters({ entities });
        const routers = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            routers,
            (router) => router.getAll(),
            (route) => route.name
        );
        expect(routeNames).toEqualMessy(["user_delete", "user_restore"]);

        closeTestConnection();
    });

    it("can add middlewares before/after requestContext middleware", async () => {
        let count = 0;
        const increment = () => count++;
        const state: ObjectLiteral = {};

        const beforeMw = async (ctx: TestContext, next: Function) => {
            ctx.state.increment = increment;
            state[count] = ctx.state.requestContext; // should be undefined
            return next();
        };
        const afterMw = async (ctx: TestContext, next: Function) => {
            ctx.state.increment();
            state[count] = ctx.state.requestContext; // should be defined
            return next();
        };

        @EntityRoute({ operations: ["list"] }, { beforeCtxMiddlewares: [beforeMw], afterCtxMiddlewares: [afterMw] })
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string;

            @Column()
            username: string;
        }

        const entities = [User];
        const { server, client } = await setupTestApp(entities);

        await client.get("/user");

        expect(state[0]).toBeUndefined();
        expect(state[1]).toHaveProperty("ctx");
        expect(count).toEqual(1);

        server.close();
        return closeTestConnection();
    });

    it("can add inherited global middlewares before/after requestContext middleware", async () => {
        let count = 0;
        const increment = () => count++;
        const state: ObjectLiteral = {};

        const beforeMw = async (ctx: TestContext, next: Function) => {
            ctx.state.increment = increment;
            state[count] = ctx.state.requestContext; // should be undefined
            return next();
        };
        const afterMw = async (ctx: TestContext, next: Function) => {
            ctx.state.increment();
            state[count] = ctx.state.requestContext; // should be defined
            return next();
        };

        @EntityRoute({ operations: ["list"] })
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string;

            @Column()
            username: string;
        }

        const entities = [User];
        const { server, client } = await setupTestApp(entities, {
            beforeCtxMiddlewares: [beforeMw],
            afterCtxMiddlewares: [afterMw],
        });

        await client.get("/user");

        expect(state[0]).toBeUndefined();
        expect(state[1]).toHaveProperty("ctx");
        expect(count).toEqual(1);

        server.close();
        return closeTestConnection();
    });
});
