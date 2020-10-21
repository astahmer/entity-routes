import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository, OneToMany } from "typeorm";
import { Groups, DependsOn, Cleaner, MappingManager, isAnyItemPropMapped, MappingItem } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/testConnection";
import { Container } from "typedi";

describe("Cleaner", () => {
    class AbstractEntity {
        @Groups(["create", "update"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ user: ["create"] })
        @Column()
        title: string;

        @Column()
        startDate: Date;

        @Column()
        endDate: Date;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups({ user: "all" })
        @Column()
        name: string;

        @Column()
        @Groups({ user: ["create"] })
        email: string;

        @ManyToOne(() => Role)
        @Groups({ user: ["create", "update"] })
        role: Role;

        @Groups({ user: ["create", "update"] })
        @OneToMany(() => Article, (article) => article.author)
        articles: Article[];

        @Groups({ user: ["create", "update"] })
        @Column({ type: "simple-json" })
        settings: object;

        @Groups({ user: ["create", "update"] })
        @Column({ type: "simple-array" })
        scopes: string[];

        @DependsOn(["id", "name"])
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

    beforeAll(() => createTestConnection([Role, User, Article]));
    afterAll(closeTestConnection);

    describe("cleanItem", () => {
        const cleaner = Container.get(Cleaner);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = new Date();
        role.endDate = new Date();

        values.role = role;

        describe("excluding un-exposed props", () => {
            it("Role.startDate/endDate should have been excluded", () => {
                const rootMetadata = getRepository(User).metadata;
                expect(cleaner.cleanItem({ values, operation: "create", rootMetadata })).toEqual({
                    id: 1,
                    name: "Alex",
                    email: "email@test.com",
                    role: { id: 1, title: "Admin" },
                });
            });

            it("Anything in role except id should have been excluded along with User.email", () => {
                const rootMetadata = getRepository(User).metadata;

                expect(cleaner.cleanItem({ values, operation: "update", rootMetadata })).toEqual({
                    id: 1,
                    name: "Alex",
                    role: { id: 1 },
                });
            });
        });

        describe("should handle 'simple-xxx' column types", () => {
            it("simple-json", () => {
                const rootMetadata = getRepository(User).metadata;
                const user = new User();
                user.id = 11;
                user.name = "Andre";
                user.settings = { abc: "def" }; // should be untouched

                expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                    id: 11,
                    name: "Andre",
                    settings: { abc: "def" },
                });
            });

            it("simple-array", () => {
                const rootMetadata = getRepository(User).metadata;
                const user = new User();
                user.id = 12;
                user.name = "Andre";
                user.scopes = ["users", "things"]; // should be untouched

                expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                    id: 12,
                    name: "Andre",
                    scopes: ["users", "things"],
                });
            });
        });

        it("XToOne relation property", () => {
            const rootMetadata = getRepository(User).metadata;
            const user = new User();
            user.id = 2;
            user.name = "Andre";

            user.role = "123" as any; // Directly provide Role.id rather than creating a Role object with { id: 123 }

            expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                id: 2,
                name: "Andre",
                role: 123,
            });
        });

        describe("XToMany relation property", () => {
            // Same format method will be used for XToOne relation property, just testing it once here

            it("should format number ids", () => {
                const rootMetadata = getRepository(User).metadata;
                const user = new User();
                user.id = 3;
                user.name = "Andre";
                user.articles = [456, 789] as any; // Directly provide Article.id rather than creating a Article object with { id: 456 }

                expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                    id: 3,
                    name: "Andre",
                    articles: [{ id: 456 }, { id: 789 }],
                });
            });

            it("should format strings ids", () => {
                const rootMetadata = getRepository(User).metadata;
                const user = new User();
                user.id = 4;
                user.name = "Andre";
                user.articles = ["456", "789"] as any; // now as strings

                expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                    id: 4,
                    name: "Andre",
                    articles: [{ id: 456 }, { id: 789 }],
                });
            });

            it("should format strings iris", () => {
                const rootMetadata = getRepository(User).metadata;
                const user = new User();
                user.id = 5;
                user.name = "Andre";
                user.articles = ["/api/article/456", "/api/article/789"] as any; // now as strings iri

                expect(cleaner.cleanItem({ values: user, operation: "update", rootMetadata })).toEqual({
                    id: 5,
                    name: "Andre",
                    articles: [{ id: 456 }, { id: 789 }],
                });
            });
        });
    });

    it("isAnyItemPropMapped", () => {
        const mappingManager = Container.get(MappingManager);
        const rootMetadata = getRepository(User).metadata;
        const routeMapping = mappingManager.make(rootMetadata, "create") as MappingItem;

        const user = new User();
        expect(isAnyItemPropMapped(user, routeMapping)).toEqual(false);

        user.name = "Alex";
        expect(isAnyItemPropMapped(user, routeMapping)).toEqual(true);
    });
});
