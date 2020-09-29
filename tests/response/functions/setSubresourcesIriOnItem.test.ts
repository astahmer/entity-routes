import { Container } from "typedi";
import { getRepository } from "typeorm";
import { Decorator, setSubresourcesIriOnItem } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { User, Article, Comment, Role, ThingWithComputed, makeItem } from "./sample/entities";

describe("setSubresourcesIriOnItem", () => {
    beforeAll(() => createTestConnection([Role, User, ThingWithComputed, Article, Comment]));
    afterAll(closeTestConnection);

    const item = makeItem();
    const decorator = Container.get(Decorator);

    it("Subresource (comments) as iris should have been added", async () => {
        const rootMetadata = getRepository(User).metadata;

        const formatedWithSubresource = await decorator.decorateItem({
            rootItem: item,
            rootMetadata,
            data: { useIris: true },
            decorateFn: setSubresourcesIriOnItem,
        });

        expect(formatedWithSubresource.comments).toEqual("/api/user/1/comments");
    });

    it("Subresource (comments) as ids should have been added", async () => {
        const rootMetadata = getRepository(User).metadata;

        const formatedWithSubresource = await decorator.decorateItem({
            rootItem: item,
            rootMetadata,
            decorateFn: setSubresourcesIriOnItem,
        });
        expect(formatedWithSubresource.comments).toEqual(1);
    });
});
