import Container from "typedi";
import { getRepository } from "typeorm";

import { closeTestConnection, createTestConnection } from "@@/testConnection";
import { Decorator, makeComputedPropNameFromMethod, setComputedPropsOnItem } from "@/index";

import { Article, Comment, Role, ThingWithComputed, User, makeItem } from "./sample/entities";

describe("Computed props", () => {
    beforeAll(() => createTestConnection([Role, User, ThingWithComputed, Article, Comment]));
    afterAll(closeTestConnection);

    const item = makeItem();
    const role = item.role;
    const decorator = Container.get(Decorator);

    describe("setComputedPropsOnItem", () => {
        it("Computed prop (identifier) should have been added", async () => {
            const rootMetadata = getRepository(User).metadata;

            const formated = await decorator.decorateItem({
                rootItem: item,
                rootMetadata,
                data: { operation: "details" },
                decorateFn: setComputedPropsOnItem,
            });

            expect(formated).toEqual({
                articles: [{ id: 1 }, { id: 2 }],
                email: "email@test.com",
                id: 1,
                identifier: "1_Alex",
                name: "Alex",
                role: { id: 1, startDate: role.startDate, title: "Admin" },
            });
        });

        it("should have added computed props on array prop", async () => {
            const thing1 = new ThingWithComputed();
            thing1.id = 777;

            const thing2 = new ThingWithComputed();
            thing2.id = 888;

            const article = new Article();
            article.id = 999;
            article.thingsWithComputed = [thing1, thing2];

            const rootMetadata = getRepository(Article).metadata;

            const result = await decorator.decorateItem({
                rootItem: article,
                rootMetadata,
                data: { operation: "details" },
                decorateFn: setComputedPropsOnItem,
            });

            expect(result).toEqualMessy({
                id: 999,
                thingsWithComputed: [
                    { id: 777, identifier: "777_123456" },
                    { id: 888, identifier: "888_123456" },
                ],
            });
        });

        it("should set computed props even if only id is remaining", async () => {
            const rootMetadata = getRepository(User).metadata;
            const item = new User();
            item.id = 456;

            expect(
                await decorator.decorateItem({
                    rootItem: item,
                    rootMetadata,
                    data: { operation: "details" },
                    decorateFn: setComputedPropsOnItem,
                })
            ).toEqual({
                id: 456,
                identifier: "456_undefined",
            });
        });
    });

    it("makeComputedPropNameFromMethod", () => {
        expect(makeComputedPropNameFromMethod("getIdentifier")).toEqual("identifier");
        expect(makeComputedPropNameFromMethod("hasIdentifier")).toEqual("identifier");
        expect(makeComputedPropNameFromMethod("isIdentifier")).toEqual("identifier");
        expect(() => makeComputedPropNameFromMethod("invalidAutoMethodNameIdentifier")).toThrow();
    });
});
