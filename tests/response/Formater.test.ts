import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository, OneToMany } from "typeorm";
import { Groups, DependsOn, Formater, Subresource, makeComputedPropNameFromMethod } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";

describe("Formater", () => {
    describe("formatItem properly", () => {
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

        class SimpleThing {
            id: number;
        }

        @Entity()
        class ThingWithComputed extends AbstractEntity {
            @ManyToOne(() => Article, (article) => article.thingsWithComputed)
            article: () => Article; // wrap in fn to avoid ReferenceError: Cannot access 'Article' before initialization

            @DependsOn(["id"])
            @Groups("all")
            getIdentifier() {
                return `${this.id}_123456`;
            }
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
            thing: SimpleThing;

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

            @OneToMany(() => ThingWithComputed, (thingWithComputed) => thingWithComputed.article)
            thingsWithComputed: ThingWithComputed[];
        }

        @Entity()
        class Comment extends AbstractEntity {
            @Column()
            message: string;

            @ManyToOne(() => User, (user) => user.comments)
            writer: User;
        }

        beforeAll(() => createTestConnection([Role, User, ThingWithComputed, Article, Comment]));
        afterAll(closeTestConnection);

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

        it("should have added computed props on array prop", async () => {
            const thing1 = new ThingWithComputed();
            thing1.id = 777;

            const thing2 = new ThingWithComputed();
            thing2.id = 888;

            const article = new Article();
            article.id = 999;
            article.thingsWithComputed = [thing1, thing2];

            const entityMetadata = getRepository(Article).metadata;

            const result = await formater.formatItem({
                item: article,
                operation: "details",
                entityMetadata,
                options: { shouldSetSubresourcesIriOnItem: true },
            });
            expect(result).toEqualMessy({
                id: 999,
                thingsWithComputed: [
                    { id: 777, identifier: "777_123456" },
                    { id: 888, identifier: "888_123456" },
                ],
            });
        });

        it("Subresource (comments) as iris should have been added", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithSubresource = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldSetSubresourcesIriOnItem: true, useIris: true },
            });
            expect(formatedWithSubresource.comments).toEqual("/api/user/1/comments");
        });

        it("Subresource (comments) as ids should have been added", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithSubresource = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldSetSubresourcesIriOnItem: true },
            });
            expect(formatedWithSubresource.comments).toEqual(1);
        });

        it("Relations (articles) should have been flattened to iri", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithFlatIri = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldEntityWithOnlyIdBeFlattenedToIri: true, useIris: true },
            });
            expect(formatedWithFlatIri.articles).toEqual(["/api/article/1", "/api/article/2"]);
        });

        it("Relations (articles) should have been flattened to id", async () => {
            const entityMetadata = getRepository(User).metadata;

            const formatedWithFlatIri = await formater.formatItem({
                item,
                operation: "details",
                entityMetadata,
                options: { shouldEntityWithOnlyIdBeFlattenedToIri: true },
            });
            expect(formatedWithFlatIri.articles).toEqual([1, 2]);
        });

        it("return unregistered class objects (!entity) untouched", async () => {
            const entityMetadata = getRepository(User).metadata;

            const thing = new SimpleThing();
            thing.id = 1;

            const user = new User();
            user.id = 2;
            user.name = "Alex";
            user.thing = thing;

            expect(await formater.formatItem({ item: user, operation: "details", entityMetadata })).toEqual({
                id: 2,
                identifier: "2_Alex",
                name: "Alex",
                thing: { id: 1 },
            });
        });

        it("return item if its class is not a registered entity", async () => {
            const entityMetadata = getRepository(User).metadata;

            const thing = new SimpleThing();
            thing.id = 1;

            expect(await formater.formatItem({ item: thing, operation: "details", entityMetadata })).toEqual({ id: 1 });
        });

        it("should not flatten self when shouldOnlyFlattenNested is true", async () => {
            const entityMetadata = getRepository(Article).metadata;
            const item = new Article();
            item.id = 123;

            const args = {
                item,
                operation: "details",
                entityMetadata,
                options: { shouldEntityWithOnlyIdBeFlattenedToIri: true, useIris: true },
            };
            const flattenedResult = await formater.formatItem(args);
            const result = await formater.formatItem({
                ...args,
                options: { shouldEntityWithOnlyIdBeFlattenedToIri: true, shouldOnlyFlattenNested: true, useIris: true },
            });

            expect(flattenedResult).toEqual("/api/article/123");
            expect(result).toEqual({ id: 123 });
        });

        it("should set computed props even if only id is remaining", async () => {
            const entityMetadata = getRepository(User).metadata;
            const item = new User();
            item.id = 456;

            expect(
                await formater.formatItem({
                    item,
                    operation: "details",
                    entityMetadata,
                    options: { shouldEntityWithOnlyIdBeFlattenedToIri: true },
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
