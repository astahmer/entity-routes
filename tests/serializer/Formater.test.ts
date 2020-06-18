import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository, OneToMany } from "typeorm";
import { Groups, DependsOn, Formater, Subresource, makeComputedPropNameFromMethod } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";

describe("Formater", () => {
    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        title: string;

        @Column()
        startDate: Date;
    }

    class Thing {
        id: number;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["details"])
        @Groups({ user: "all" })
        @Column()
        name: string;

        @Groups({ user: "all" })
        @Column()
        email: string;

        @ManyToOne(() => Role)
        @Groups({ user: "all" })
        role: Role;

        @Groups({ user: "all" })
        @OneToMany(() => Article, (article) => article.author)
        articles: Article[];

        @Subresource(() => Comment)
        @OneToMany(() => Comment, (comment) => comment.writer)
        comments: Comment[];

        @Groups({ user: "all" })
        @Column({ type: "simple-json" })
        thing: Thing;

        @DependsOn(["id", "name"])
        @Groups({ user: "all" })
        getIdentifier() {
            return `${this.id}_${this.name}`;
        }
    }

    @Entity()
    class Article extends AbstractEntity {
        @Column()
        title: string;

        @ManyToOne(() => User, (user) => user.articles)
        author: User;
    }

    @Entity()
    class Comment extends AbstractEntity {
        @Column()
        message: string;

        @ManyToOne(() => User, (user) => user.comments)
        writer: User;
    }

    beforeAll(() => createTestConnection([Role, User, Article, Comment]));
    afterAll(closeTestConnection);

    describe("formatItem properly", () => {
        const formater = Container.get(Formater);

        const item = new User();
        item.id = 1;
        item.name = "Alex";
        item.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = new Date();

        const article1 = new Article();
        article1.id = 1;

        const article2 = new Article();
        article2.id = 2;

        item.role = role;
        item.articles = [article1, article2];

        it("Computed prop (identifier) should have been added and keys sorted alphabetically", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formated = await formater.formatItem({ item, operation: "details", entityMetadata });
            expect(formated).toEqual({
                articles: [{ id: 1 }, { id: 2 }],
                email: "email@test.com",
                id: 1,
                identifier: "1_Alex",
                name: "Alex",
                role: { id: 1, startDate: role.startDate, title: "Admin" },
            });
        });

        it("Subresource (comments) should have been added", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithSubresource = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldSetSubresourcesIriOnItem: true },
            });
            expect(formatedWithSubresource.comments).toEqual("/api/user/1/comments");
        });

        it("Relations (articles) should have been flattened to iri", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithFlatIri = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldEntityWithOnlyIdBeFlattenedToIri: true },
            });
            expect(formatedWithFlatIri.articles).toEqual(["/api/article/1", "/api/article/2"]);
        });

        it("return unregistered class objects (!entity) untouched", async () => {
            const entityMetadata = getRepository(User).metadata;

            const thing = new Thing();
            thing.id = 1;

            const user = new User();
            user.id = 2;
            user.name = "Alex";
            user.thing = thing;

            expect(await formater.formatItem({ item: user, entityMetadata })).toEqual({
                id: 2,
                identifier: "2_Alex",
                name: "Alex",
                thing: { id: 1 },
            });
        });

        it("return item if its class is not a registered entity", async () => {
            const entityMetadata = getRepository(User).metadata;

            const thing = new Thing();
            thing.id = 1;

            expect(await formater.formatItem({ item: thing, entityMetadata })).toEqual({ id: 1 });
        });
    });

    it("makeComputedPropNameFromMethod", () => {
        expect(makeComputedPropNameFromMethod("getIdentifier")).toEqual("identifier");
        expect(makeComputedPropNameFromMethod("hasIdentifier")).toEqual("identifier");
        expect(makeComputedPropNameFromMethod("isIdentifier")).toEqual("identifier");
        expect(() => makeComputedPropNameFromMethod("invalidAutoMethodNameIdentifier")).toThrow();
    });
});
