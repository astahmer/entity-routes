import { DecorateFn, DecorateFnArgs, Decorator, wait } from "@entity-routes/core";
import { Container } from "typedi";
import { getRepository } from "typeorm";

import { User, getWriterTestEntities, makeItem } from "@/response/functions/sample/entities";
import { closeTestConnection, createTestConnection } from "@/testConnection";

describe("Decorator", () => {
    const entities = getWriterTestEntities();
    const decorator = Container.get(Decorator);

    describe("decorateItem", () => {
        const item = makeItem();
        const data = { abc: 123, test: "just testing", zzz: 999 };

        const addedProp = "added_prop";
        const store: DecorateFnArgs<User, typeof data>[] = [];

        const baseDecorateFn: DecorateFn<User, typeof data> = (args) => {
            store.push(args);
            args.clone.testProp = addedProp;
        };
        const decorateFn = jest.fn(baseDecorateFn);

        let decorated: User;

        beforeAll(async () => {
            await createTestConnection(entities);
            decorated = await decorator.decorateItem({
                rootItem: item,
                rootMetadata: getRepository(User).metadata,
                data,
                decorateFn,
            });
        });
        afterAll(closeTestConnection);

        it("has called decorateFn for every entities in User, including User", async () => {
            expect(store.map((args) => args.itemMetadata.targetName)).toEqual(["Role", "Article", "Article", "User"]);
            expect(decorateFn).toHaveBeenCalledTimes(4);
        });

        it("has added a property for every item", async () => {
            const clone = decorated as any;
            const wasAdded = [
                clone.testProp,
                clone.role.testProp,
                ...clone.articles.map((article: any) => article.testProp),
            ].every((item) => item === addedProp);
            expect(wasAdded).toBe(true);
        });

        it("has DecorateFnArgs.isRoot true only for User", async () => {
            expect(store.find((arg) => arg.isRoot)?.itemMetadata.targetName).toEqual(User.name);
        });

        it("has rootMetadata always be User metadata", async () => {
            const isRootUser = store.every((arg) => arg.rootMetadata.targetName === User.name);
            expect(isRootUser).toBe(true);
        });

        it("has DecorateFnArgs contain custom data passed", async () => {
            expect(store[0].data).toEqual(data);
        });

        it("with async decorateFn", async () => {
            const repository = getRepository(User);
            const item = makeItem();

            const baseDecorateFn: DecorateFn<User, { delay: number }> = (args) => {
                args.clone.delay = args.data.delay;
            };
            const decorateFn = jest.fn((args: DecorateFnArgs<User>) => {
                const delay = Math.random() * 1000;
                return wait(delay, () => baseDecorateFn({ ...args, data: { delay } }));
            });
            const userClone = await decorator.decorateItem({
                rootItem: item,
                rootMetadata: repository.metadata,
                decorateFn,
            });
            const clone = userClone as any;

            const addedProp = "delay";
            const wasAdded = [
                clone[addedProp],
                clone.role[addedProp],
                ...clone.articles.map((article: any) => article[addedProp]),
            ].every((delay) => typeof delay === "number" && delay >= 0 && delay < 1000);
            expect(wasAdded).toBe(true);
        });

        it("can re-assign using cloneRef", async () => {
            const repository = getRepository(User);
            const item = makeItem();

            const decorateFn: DecorateFn<User, { delay: number }> = (args) => {
                if (!args.isRoot) {
                    args.cloneRef.ref = args.cloneRef.ref.id;
                }
            };
            const userClone = await decorator.decorateItem({
                rootItem: item,
                rootMetadata: repository.metadata,
                decorateFn,
            });
            const clone = userClone as any;

            expect(clone.role).toBeNumber();
            expect(clone.articles.every((item: any) => typeof item === "number")).toBe(true);
        });
    });
});
