import { getRepository } from "typeorm";

import { makeEntity, Writer } from "@/index";
import { closeTestConnection, createTestConnection, makeReqCtxWithState } from "@@/tests/testConnection";
import { Article, Comment, Role, ThingWithComputed, User } from "./functions/sample/entities";

describe("Writer", () => {
    beforeAll(() => createTestConnection([User, Role, Article, Comment, ThingWithComputed]));
    afterAll(closeTestConnection);

    it("makeResponse", async () => {
        const writer = new Writer(getRepository(User));

        const result = makeEntity(User, { id: 1, name: "Alex" });
        const ctx = makeReqCtxWithState({ operation: "details" });

        const response = await writer.makeResponse(ctx, result);
        const { "@context": responseCtx, ...responseEntity } = response;

        expect(responseCtx).toEqual({ operation: "details", entity: "user" });
        expect(result).toEqual(responseEntity);
    });

    it("fromItem", async () => {
        const writer = new Writer(getRepository(User));

        const item = makeEntity(User, { id: 1, name: "Alex" });
        const {
            state: { requestContext },
        } = makeReqCtxWithState({ operation: "details" });

        const clone = await writer.fromItem({ item, requestContext });
        expect(item).toEqual(clone);
    });

    it("fromItem - allow using defaults decorators", async () => {
        const writer = new Writer(getRepository(User), {
            defaultWriterOptions: {
                shouldSetComputedPropsOnItem: true,
                shouldSetSubresourcesIriOnItem: true,
                shouldEntityWithOnlyIdBeFlattenedToIri: true,
                useIris: true,
            },
        });

        const item = makeEntity(User, { id: 1, name: "Alex" });
        const {
            state: { requestContext },
        } = makeReqCtxWithState({ operation: "details" });

        const clone = await writer.fromItem({ item, requestContext });
        const entity = makeEntity(User, { ...item, identifier: "1_Alex", comments: "/api/user/1/comments" } as any);
        expect(clone).toEqual(entity);
    });

    it("fromItem - allow passing custom decorators", async () => {
        //
    });

    it("fromItem - allow deep sorting response", async () => {
        //
    });
});
