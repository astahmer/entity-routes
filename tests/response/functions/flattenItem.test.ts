import Container from "typedi";
import { getRepository } from "typeorm";
import { Decorator, flattenItem } from "@/index";
import { closeTestConnection, createTestConnection } from "@@/tests/testConnection";
import { Article, Comment, makeItem, Role, SimpleThing, ThingWithComputed, User } from "./sample/entities";

describe("Decorator > flattenItem", () => {
    beforeAll(() => createTestConnection([Role, User, ThingWithComputed, Article, Comment]));
    afterAll(closeTestConnection);

    const item = makeItem();
    const decorator = Container.get(Decorator);

    it("Relations (articles) should have been flattened to iri", async () => {
        const rootMetadata = getRepository(User).metadata;
        const formatedWithFlatIri = await decorator.decorateItem({
            rootItem: item,
            rootMetadata,
            data: { operation: "details", shouldEntityWithOnlyIdBeFlattenedToIri: true, useIris: true },
            decorateFn: flattenItem,
        });
        expect(formatedWithFlatIri.articles).toEqual(["/api/article/1", "/api/article/2"]);
    });

    it("Relations (articles) should have been flattened to id", async () => {
        const rootMetadata = getRepository(User).metadata;

        const formatedWithFlatIri = await decorator.decorateItem({
            rootItem: item,
            rootMetadata,
            data: { operation: "details", shouldEntityWithOnlyIdBeFlattenedToIri: true },
            decorateFn: flattenItem,
        });

        expect(formatedWithFlatIri.articles).toEqual([1, 2]);
    });

    it("return unregistered class objects (!entity) untouched", async () => {
        const rootMetadata = getRepository(User).metadata;

        const thing = new SimpleThing();
        thing.id = 1;

        const user = new User();
        user.id = 2;
        user.name = "Alex";
        user.thing = thing;

        expect(
            await decorator.decorateItem({
                rootItem: user,
                data: { operation: "details" },
                rootMetadata,
                decorateFn: flattenItem,
            })
        ).toEqual({
            id: 2,
            name: "Alex",
            thing,
        });
    });

    it("return item if its class is not a registered entity", async () => {
        const rootMetadata = getRepository(User).metadata;

        const thing = new SimpleThing();
        thing.id = 1;

        expect(
            await decorator.decorateItem({
                rootItem: thing,
                data: { operation: "details" },
                rootMetadata,
                decorateFn: flattenItem,
            })
        ).toEqual({ id: 1 });
    });

    it("should not flatten self when shouldOnlyFlattenNested is true", async () => {
        const rootMetadata = getRepository(Article).metadata;
        const item = new Article();
        item.id = 123;

        const data = { operation: "details", shouldEntityWithOnlyIdBeFlattenedToIri: true, useIris: true };
        const args = { rootItem: item, rootMetadata, data, decorateFn: flattenItem };

        const flattenedResult = await decorator.decorateItem(args);
        const result = await decorator.decorateItem({ ...args, data: { ...data, shouldOnlyFlattenNested: true } });

        expect(flattenedResult).toEqual("/api/article/123");
        expect(result).toEqual({ id: 123 });
    });
});
