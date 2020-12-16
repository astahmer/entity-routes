import { Column, Entity, PrimaryGeneratedColumn, getRepository } from "typeorm";

import {
    ENTITY_META_SYMBOL,
    EntityRouteOptions,
    Groups,
    MiddlewareMaker,
    RequestState,
    RouteResponse,
} from "@entity-routes/core";
import { closeTestConnection, createTestConnection, makeReqCtxWithState, makeTestCtx } from "@entity-routes/test-utils";

describe("MiddlewareMaker", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["create", "list", "createScoped"])
        @Column()
        name: string;

        @Groups(["create", "update", "details"])
        @Column()
        birthDate: Date;
    }

    beforeAll(() => createTestConnection([User]));
    afterAll(closeTestConnection);

    it("makeRequestContextMiddleware", async () => {
        const repository = getRepository(User);
        const maker = new MiddlewareMaker(repository);

        const mw = maker.makeRequestContextMiddleware({ operation: "list" });
        const ctx = makeTestCtx<RequestState<User>>({ query: { id: "123" } });
        const nextSpy = jest.fn();
        const req = mw(ctx, nextSpy);

        expect(ctx.state.requestContext.queryParams).toEqual({ id: "123" });

        await req;

        expect(nextSpy).toHaveBeenCalled();
    });

    it("makeResponseMiddleware", async () => {
        const repository = getRepository(User);
        const maker = new MiddlewareMaker(repository);

        const mw = maker.makeResponseMiddleware();
        const ctx = makeTestCtx<RequestState<User>>({
            query: { id: "123" },
            state: { requestContext: { operation: "list" } },
        });
        const noop = async () => {};

        await mw(ctx, noop);

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
        const maker = new MiddlewareMaker(repository);

        const mw = maker.makeRouteMappingMiddleware("list");
        const ctx = makeTestCtx<RequestState<User>>();
        const noop = async () => {};

        await mw(ctx, noop);

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

    // TODO Doc response handling
    it("makeResponseMiddleware - can override route options on specific operation with scoped options", async () => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
        const routeOptions: EntityRouteOptions = { defaultCreateUpdateOptions: { shouldAutoReload: true } };
        const repository = getRepository(User);

        const options = {
            ...routeOptions,
            scopedOptions: (operation: string) =>
                operation === "create" && {
                    defaultCreateUpdateOptions: { responseOperation: "createScoped" },
                },
        };

        const maker = new MiddlewareMaker(repository, options);
        const mw = maker.makeResponseMiddleware();
        const noop = async () => {};

        const createCtx = makeReqCtxWithState({ operation: "create", values: { name: "Alex", birthDate: new Date() } });
        await mw(createCtx as any, noop);
        const createResult = createCtx.responseBody as RouteResponse<"item", User>;

        const updateCtx = makeReqCtxWithState({
            operation: "update",
            entityId: createResult.id,
            values: { name: "Alex222" },
        });
        await mw(updateCtx as any, noop);
        const updateResult = updateCtx.responseBody as RouteResponse<"item", User>;

        const detailsCtx = makeReqCtxWithState({ operation: "details", entityId: createResult.id });
        await mw(detailsCtx as any, noop);
        const detailsResult = detailsCtx.responseBody as RouteResponse<"item", User>;
        // Overriding operation to test equality for everything else
        const detailsResultWithUpdateOperation = {
            ...detailsResult,
            "@context": { ...detailsResult["@context"], operation: "update" },
        };

        // The birthDate is exposed on user.details route scope, while the name is NOT
        expect(updateResult.birthDate).toBeDefined();
        expect(updateResult.name).toBeUndefined();
        expect(updateResult).toEqualMessy(detailsResultWithUpdateOperation);
        // But birthDate is undefined / the name IS exposed on the user.createScoped route scope
        // since the responseOperation was customized on the "create" operation using scopedOptions
        expect(createResult.name).toBeDefined();
        expect(createResult.birthDate).toBeUndefined();
    });
});
