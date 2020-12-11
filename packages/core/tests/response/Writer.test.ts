import { getRepository } from "typeorm";

import { CustomDecoratorFnArgs, DecorateFn, Writer, WriterOptions, makeEntity } from "@entity-routes/core";
import { closeTestConnection, createTestConnection, makeReqCtxWithState } from "@entity-routes/test-utils";

import { User, getWriterTestEntities } from "./functions/sample/entities";

describe("Writer", () => {
    const entities = getWriterTestEntities();

    beforeAll(() => createTestConnection(entities));
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
                shouldEntityWithOnlyIdBeFlattened: true,
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
        const writer = new Writer(getRepository(User));

        const item = makeEntity(User, { id: 1, name: "Alex" });
        const {
            state: { requestContext },
        } = makeReqCtxWithState({ operation: "details" });

        const decoratorFn: DecorateFn<any, CustomDecoratorFnArgs> = ({
            clone,
            item,
            rootMetadata,
            itemMetadata,
            data,
            isRoot,
        }) => {
            clone.abc = "123";
            clone.operation = data.requestContext.operation;
            clone.rootEntity = rootMetadata.tableName;
            clone.entity = itemMetadata.tableName;
            clone.isRoot = isRoot;
            clone.isItemUser = item.constructor.name === itemMetadata.targetName;
        };
        const customDecorator = jest.fn(decoratorFn);
        const innerOptions: WriterOptions = { decorators: [customDecorator] };
        const clone = await writer.fromItem({ item, requestContext, innerOptions });

        expect(clone).toEqual({
            id: 1,
            name: "Alex",
            abc: "123",
            operation: "details",
            rootEntity: "user",
            entity: "user",
            isItemUser: true,
            isRoot: true,
        });
    });

    it("fromItem - allow sorting clone keys", async () => {
        const writer = new Writer(getRepository(User));

        const item = makeEntity(User, { id: 1, name: "Alex" });
        const {
            state: { requestContext },
        } = makeReqCtxWithState({ operation: "details" });

        const decoratorFn: DecorateFn<any, CustomDecoratorFnArgs> = ({
            clone,
            item,
            rootMetadata,
            itemMetadata,
            data,
            isRoot,
        }) => {
            clone.abc = "123";
            clone.operation = data.requestContext.operation;
            clone.rootEntity = rootMetadata.tableName;
            clone.entity = itemMetadata.tableName;
            clone.isRoot = isRoot;
            clone.isItemUser = item.constructor.name === itemMetadata.targetName;
        };
        const customDecorator = jest.fn(decoratorFn);
        const innerOptions: WriterOptions = { decorators: [customDecorator], shouldSortItemKeys: false };
        const cloneKeys = ["id", "name", "abc", "operation", "rootEntity", "entity", "isRoot", "isItemUser"];

        const clone = await writer.fromItem({ item, requestContext, innerOptions });
        const cloneWithSortedKeys = await writer.fromItem({
            item,
            requestContext,
            innerOptions: { ...innerOptions, shouldSortItemKeys: true },
        });

        expect(Object.keys(clone)).toEqual(cloneKeys);
        expect(Object.keys(cloneWithSortedKeys)).toEqual(cloneKeys.sort());
    });
});
