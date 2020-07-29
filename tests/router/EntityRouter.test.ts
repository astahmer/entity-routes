import { PrimaryGeneratedColumn, Column, Entity, DeleteDateColumn } from "typeorm";
import { EntityRoute, makeKoaEntityRouters, flatMapOnProp, ObjectLiteral } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Context } from "koa";
import { setupKoaApp } from "@@/tests/router/bridge/koaSetup";

describe("EntityRouter", () => {
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
        const connection = await createTestConnection(entities);
        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const koaRouters = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            koaRouters,
            (router) => router.stack,
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
        const connection = await createTestConnection(entities);
        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const koaRouters = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            koaRouters,
            (router) => router.stack,
            (route) => route.name
        );
        expect(routeNames).toEqual([
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
        const connection = await createTestConnection(entities);
        const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
        const koaRouters = bridgeRouters.map((bridge) => bridge.instance);

        const routeNames = flatMapOnProp(
            koaRouters,
            (router) => router.stack,
            (route) => route.name
        );
        expect(routeNames).toEqual(["user_delete", "user_restore"]);

        closeTestConnection();
    });

    it("can add middlewares before/after requestContext middleware", async () => {
        let count = 0;
        const increment = () => count++;
        const state: ObjectLiteral = {};

        const beforeMw = async (ctx: Context, next: Function) => {
            ctx.state.increment = increment;
            state[count] = ctx.state.requestContext; // should be undefined
            return next();
        };
        const afterMw = async (ctx: Context, next: Function) => {
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
        const { server, client } = await setupKoaApp(entities);

        await client.get("/user");

        expect(state[0]).toBeUndefined();
        expect(state[1]).toHaveProperty("ctx");
        expect(count).toEqual(1);

        server.close();
        return closeTestConnection();
    });
});
