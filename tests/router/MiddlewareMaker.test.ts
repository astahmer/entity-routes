import { PrimaryGeneratedColumn, Column, Entity, getRepository, getConnection } from "typeorm";
import { MiddlewareMaker, RequestState, Groups, ENTITY_META_SYMBOL } from "@/index";
import { createTestConnection, closeTestConnection, makeTestCtx } from "@@/tests/testConnection";

describe("MiddlewareMaker", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["list"])
        @Column()
        name: string;

        @Groups(["details"])
        @Column()
        birthDate: Date;
    }

    beforeAll(() => createTestConnection([User]));
    afterAll(closeTestConnection);

    it("makeRequestContextMiddleware", async () => {
        const connection = getConnection();
        const repository = getRepository(User);
        const manager = new MiddlewareMaker(repository);

        const mw = manager.makeRequestContextMiddleware("list");
        const ctx = makeTestCtx<RequestState<User>>({ query: { id: "123" } });
        const nextSpy = jest.fn();
        const req = mw(ctx as any, nextSpy);

        expect(ctx.state.queryRunner.connection).toBe(connection);
        expect(ctx.state.requestContext.queryParams).toEqual({ id: "123" });
        expect(ctx.state.queryRunner.isReleased).toBe(false);

        await req;

        expect(nextSpy).toHaveBeenCalled();
    });

    it("makeResponseMiddleware", async () => {
        const repository = getRepository(User);
        const manager = new MiddlewareMaker(repository);

        const mw = manager.makeResponseMiddleware("list");
        const ctx = makeTestCtx<RequestState<User>>({ query: { id: "123" } });
        const noop = async () => {};

        await mw(ctx as any, noop);

        expect(ctx.status).toEqual(200);
        expect(ctx.responseBody).toEqual({
            "@context": {
                operation: "list",
                entity: "user",
                retrievedItems: 0,
                totalItems: 0,
            },
            items: [],
        });
    });

    it("makeRouteMappingMiddleware", async () => {
        const repository = getRepository(User);
        const manager = new MiddlewareMaker(repository);

        const mw = manager.makeRouteMappingMiddleware("list");
        const ctx = makeTestCtx<RequestState<User>>();
        const noop = async () => {};

        await mw(ctx as any, noop);

        expect(ctx.status).toEqual(200); // which means there was no error
        expect(ctx.responseBody).toMatchObject({
            context: { operation: "list.mapping", entity: "user" },
            routeMapping: {
                selectProps: ["name", "id"],
                relationProps: [],
                exposedProps: ["name", "id"],
                mapping: {},
            },
        });
        expect(ctx.responseBody.routeMapping[ENTITY_META_SYMBOL]).toBe(repository.metadata);
    });
});
