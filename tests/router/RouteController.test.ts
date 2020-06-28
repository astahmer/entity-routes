import {
    Groups,
    RouteController,
    Search,
    Subresource,
    getSubresourceRelation,
    EntityRouteOptions,
    ObjectLiteral,
    ObjectLiteralType,
} from "@/index";
import { PrimaryGeneratedColumn, Entity, Column, getRepository, ManyToOne, OneToMany, ObjectType } from "typeorm";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { IsString, IsDate, IsEmail } from "class-validator";
import { Container } from "typedi";
import { log } from "@/functions/utils";

const routeOptions: EntityRouteOptions = { defaultCreateUpdateOptions: { shouldAutoReload: true } };

describe("RouteController - simple", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ role: "all", user: ["create", "details"] })
        @Column()
        identifier: string;

        @Groups({ role: "all", user: ["create", "details"] })
        @Column()
        name: string;
    }

    @Search({ all: true })
    @Entity()
    class User extends AbstractEntity {
        @IsString()
        @Groups(["create", "list"])
        @Column()
        name: string;

        @IsDate()
        @Groups(["create", "update", "details"])
        @Column()
        birthDate: Date;

        @Groups("all")
        @ManyToOne(() => Role, { cascade: true })
        role: Role;
    }

    beforeEach(() => createTestConnection([Role, User]));
    afterEach(closeTestConnection);

    afterAll(() => {
        // since entities differ between tests suites, metadata cached on MappingManager must be cleared
        Container.reset();
        return closeTestConnection();
    });

    describe("create", () => {
        it("inserts item", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository);

            const birthDate = new Date();
            const values = {
                name: "Alex",
                birthDate,
                role: { identifier: "ADM", name: "Admin" },
            };

            const result = (await ctrl.create({ values })) as User;
            expect(result.constructor).toBe(User);
            expect(result.role.constructor).toBe(Role);
            expect(result).toEqual({
                name: "Alex",
                birthDate,
                role: { identifier: "ADM", name: "Admin", id: 1 },
                id: 1,
            });
        });

        it("inserts item & format result", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, { defaultCreateUpdateOptions: { shouldFormatResult: true } });

            const birthDate = new Date();
            const values = {
                name: "Alex",
                birthDate,
                role: { identifier: "ADM", name: "Admin" },
            };

            const result = (await ctrl.create({ values })) as User; // actually is just ObjectLiteral with structure of User
            expect(result.constructor).toBe(Object);
            expect(result.role.constructor).toBe(Object);
            expect(result).toEqual({
                birthDate,
                id: 1,
                name: "Alex",
                role: { id: 1, identifier: "ADM", name: "Admin" },
            });
        });

        it("inserts item & auto reload it using getDetails", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            const birthDate = new Date();
            const values = {
                name: "Alex",
                birthDate,
                role: { identifier: "ADM", name: "Admin" },
            };

            const result = await ctrl.create({ values });
            expect(result).toEqual({
                birthDate,
                id: 1,
                role: { id: 1, identifier: "ADM", name: "Admin" },
            });
        });

        it("returns error when body is empty", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            const values = {};
            const result = await ctrl.create({ values });
            expect(result).toEqual({ error: "Body can't be empty on create operation" });
        });

        it("returns validation errors when sending invalid values", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            const birthDate = new Date();
            const values = {
                name: 123 as any, // invalid string
                birthDate,
                role: { identifier: "ADM", name: "Admin" },
            };

            const result = await ctrl.create({ values }, { validatorOptions: { noAutoGroups: true } });
            expect(result).toEqual({
                hasValidationErrors: true,
                errors: {
                    user: [{ currentPath: "", property: "name", constraints: { isString: "name must be a string" } }],
                },
            });
        });
    });

    describe("update", () => {
        it("updates item", async () => {
            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);
            const modRole = await roleCtrl.create({ values: { identifier: "MOD", name: "Moderator" } });

            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository);

            const birthDate = new Date();
            const createResult = await userCtrl.create({ values: { name: "Alex", birthDate } });
            const updateResult = (await userCtrl.update({
                values: { id: (createResult as User).id, role: (modRole as Role).id as any },
            })) as User;

            expect(updateResult.constructor).toBe(User);
            expect(updateResult).toEqual({ id: 1, role: 1 });
        });

        it("updates item & format result", async () => {
            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);
            const modRole = await roleCtrl.create({ values: { identifier: "MOD", name: "Moderator" } });

            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, {
                defaultCreateUpdateOptions: { shouldFormatResult: true },
            });

            const birthDate = new Date();
            const createResult = await userCtrl.create({ values: { name: "Alex", birthDate } });
            const updateResult = (await userCtrl.update({
                values: { id: (createResult as User).id, role: (modRole as Role).id as any },
            })) as User; // actually is just ObjectLiteral with structure of User

            expect(updateResult.constructor).toBe(Object);
            expect(updateResult).toEqual({ id: 1, role: 1 });
        });

        it("updates item & auto reload it using getDetails", async () => {
            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);
            const modRole = await roleCtrl.create({ values: { identifier: "MOD", name: "Moderator" } });

            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);

            const birthDate = new Date();
            const createResult = await userCtrl.create({ values: { name: "Alex", birthDate } });
            const updateResult = await userCtrl.update({
                values: { id: (createResult as User).id, role: (modRole as Role).id as any },
            });

            expect(updateResult).toEqual({
                birthDate,
                id: 1,
                role: { id: 1, identifier: "MOD", name: "Moderator" },
            });
        });

        it("returns validation errors when sending invalid values", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);

            const birthDate = new Date();
            const createResult = await userCtrl.create({ values: { name: "Alex", birthDate } });
            const updateResult = await userCtrl.update(
                {
                    values: { id: (createResult as User).id, birthDate: "abc" as any },
                },
                { validatorOptions: { noAutoGroups: true } }
            );

            expect(updateResult).toEqual({
                hasValidationErrors: true,
                errors: {
                    user: [
                        {
                            currentPath: "",
                            property: "birthDate",
                            constraints: { isDate: "birthDate must be a Date instance" },
                        },
                    ],
                },
            });
        });
    });

    describe("getList", () => {
        it("returns collection", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            // Running sequentially to keep expected id
            await ctrl.create({
                values: { name: "Alex", birthDate: new Date(), role: { identifier: "ADM", name: "Admin" } },
            });

            await ctrl.create({
                values: { name: "Andre", birthDate: new Date(), role: { identifier: "MOD", name: "Moderator" } },
            });

            await ctrl.create({
                values: { name: "Max", birthDate: new Date(), role: { identifier: "MAN", name: "Manager" } },
            });

            const result = await ctrl.getList();
            expect(result).toEqual({
                items: [
                    { id: 1, name: "Alex", role: { id: 1 } },
                    { id: 2, name: "Andre", role: { id: 2 } },
                    { id: 3, name: "Max", role: { id: 3 } },
                ],
                totalItems: 3,
            });
        });

        it("returns collection filtered by queryParams", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            // Running sequentially to keep expected id
            await ctrl.create({
                values: { name: "Alex", birthDate: new Date(), role: { identifier: "ADM", name: "Admin" } },
            });

            await ctrl.create({
                values: { name: "Andre", birthDate: new Date(), role: { identifier: "MOD", name: "Moderator" } },
            });

            await ctrl.create({
                values: { name: "Max", birthDate: new Date(), role: { identifier: "MAN", name: "Manager" } },
            });

            const result1 = await ctrl.getList({ queryParams: { "name;contains": "x" } });
            expect(result1).toEqual({
                items: [
                    { id: 1, name: "Alex", role: { id: 1 } },
                    { id: 3, name: "Max", role: { id: 3 } },
                ],
                totalItems: 2,
            });

            const result2 = await ctrl.getList({
                queryParams: { "role.identifier;startsWith": "m" },
            });
            expect(result2).toEqual({
                items: [
                    { id: 2, name: "Andre", role: { id: 2 } },
                    { id: 3, name: "Max", role: { id: 3 } },
                ],
                totalItems: 2,
            });
        });
    });

    it("getDetails", async () => {
        const repository = getRepository(User);
        const ctrl = new RouteController(repository, routeOptions);

        const birthDate = new Date();
        const createResult = (await ctrl.create({
            values: { name: "Alex", birthDate },
        })) as User;

        const result = await ctrl.getDetails({ entityId: createResult.id });
        expect(result).toEqual(createResult);
    });

    describe("delete", () => {
        it("removes entity", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository, routeOptions);

            const createResult = (await ctrl.create({ values: { name: "Alex", birthDate: new Date() } })) as User;

            await ctrl.delete({ entityId: createResult.id });

            expect(() => ctrl.getDetails({ entityId: createResult.id })).rejects.toThrowError("Not found.");
        });
    });
});

describe("RouteController - subresources", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ role: "all" })
        @Column()
        title: string;

        @Groups({ role: "all" })
        @Column({ nullable: true })
        startDate: Date;

        @Groups(["roleTestDetails"])
        @Column({ nullable: true })
        endDate: Date;

        @Groups({ role: ["details"] })
        @Subresource(() => User)
        @OneToMany(() => User, (user) => user.role)
        mainRoleOfUsers: User[];
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups({ user: "all" })
        @Column()
        name: string;

        @Groups({ user: "all" })
        @IsEmail()
        @Column()
        email: string;

        @Groups({ user: ["create", "roleTestDetails"] })
        @Subresource(() => Role)
        @ManyToOne(() => Role, (role) => role.mainRoleOfUsers)
        role: Role;

        @Groups({ user: ["create", "articleTestDetails"] })
        @Subresource(() => Article)
        @OneToMany(() => Article, (article) => article.author)
        articles: Article[];
    }

    @Entity()
    class Article extends AbstractEntity {
        @Groups({ article: "all" })
        @Column()
        title: string;

        @Groups({ article: ["details", "list"] })
        @ManyToOne(() => User, (user) => user.articles)
        author: User;

        @Subresource(() => Comment)
        @OneToMany(() => Comment, (comment) => comment.article)
        comments: Comment[];
    }

    @Entity()
    class Comment extends AbstractEntity {
        @Column()
        message: string;

        @ManyToOne(() => Article, (article) => article.comments)
        article: User;
    }

    beforeEach(() => createTestConnection([Comment, Article, Role, User]));
    afterEach(closeTestConnection);

    describe("create", () => {
        it("inserts new item and join it to parent (XToOne)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);

            const values = { title: "Admin" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "role");
            subresourceRelation.id = userResult.id;

            const result = await roleCtrl.create({ values, subresourceRelations: [subresourceRelation] });
            expect(result).toEqual({
                id: 1,
                title: values.title,
                startDate: null,
                mainRoleOfUsers: [{ id: userResult.id }],
            });
        });

        it("join existing item on parent (XToOne)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);

            const values = { title: "Admin" };
            const roleResult = (await roleCtrl.create({ values })) as Role;

            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "role");
            subresourceRelation.id = userResult.id;

            // Role should be null for now
            expect(
                await userCtrl.getDetails({
                    entityId: userResult.id,
                    operation: "roleTestDetails",
                })
            ).toEqual({ id: 1, name: "Alex", email: "alex@mail.com", role: null });

            const result = (await roleCtrl.create({
                values: { id: roleResult.id },
                subresourceRelations: [subresourceRelation],
            })) as Role;

            // Role should have been joined to given user
            expect(result).toEqual({
                id: 1,
                title: values.title,
                startDate: null,
                mainRoleOfUsers: [{ id: userResult.id }],
            });

            // User should have its role set
            expect(
                await userCtrl.getDetails({
                    entityId: userResult.id,
                    operation: "roleTestDetails",
                })
            ).toEqual({
                id: 1,
                name: "Alex",
                email: "alex@mail.com",
                role: { id: result.id, endDate: null, startDate: null, title: values.title },
            });
        });

        it("inserts new item in parent collection (XToMany)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const articleRepository = getRepository(Article);
            const articleCtrl = new RouteController(articleRepository, routeOptions);

            const values = { title: "How to add new item in parent collection XToMany" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "articles");
            subresourceRelation.id = userResult.id;

            const result = await articleCtrl.create({ values, subresourceRelations: [subresourceRelation] });
            expect(result).toEqual({ id: 1, title: values.title, author: { id: userResult.id } });
        });

        it("add existing item in parent collection (XToMany)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const articleRepository = getRepository(Article);
            const articleCtrl = new RouteController(articleRepository, routeOptions);

            const values = { title: "How to add existing item in parent collection XToMany" };
            const articleResult = (await articleCtrl.create({ values })) as Article;

            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "articles");
            subresourceRelation.id = userResult.id;

            // Articles should be an empty array for now
            expect(
                await userCtrl.getDetails({
                    entityId: userResult.id,
                    operation: "articleTestDetails",
                })
            ).toEqual({ id: 1, name: "Alex", email: "alex@mail.com", articles: [] });

            const result = (await articleCtrl.create({
                values: { id: articleResult.id },
                subresourceRelations: [subresourceRelation],
            })) as Article;

            // Article should have been joined on the given user
            expect(result).toEqual({
                id: 1,
                title: values.title,
                author: { id: userResult.id },
            });

            // Articles array should contain joined article
            expect(
                await userCtrl.getDetails({
                    entityId: userResult.id,
                    operation: "articleTestDetails",
                })
            ).toEqual({ id: 1, name: "Alex", email: "alex@mail.com", articles: [{ id: result.id }] });
        });
    });

    // TODO Nested subresources
    describe("getList", () => {
        it("auto joins from parent subresource", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const articleRepository = getRepository(Article);
            const articleCtrl = new RouteController(articleRepository, routeOptions);

            const values = { title: "Join collection on parent" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "articles");
            subresourceRelation.id = userResult.id;

            const subresourceRelations = [subresourceRelation];
            await articleCtrl.create({ values, subresourceRelations });

            const result = await articleCtrl.getList({ subresourceRelations });
            expect(result).toEqual({
                items: [{ id: 1, title: values.title, author: { id: userResult.id } }],
                totalItems: 1,
            });
        });

        it("auto add joins from multiple parent subresources", () => {
            return; // TODO
        });
    });

    describe("getDetails", () => {
        it("auto joins from parent subresource", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);

            const values = { title: "Join item on parent" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "role");
            subresourceRelation.id = userResult.id;

            const subresourceRelations = [subresourceRelation];
            await roleCtrl.create({ values, subresourceRelations });

            const result = await roleCtrl.getDetails({ subresourceRelations });
            expect(result).toEqual({
                id: 1,
                title: values.title,
                mainRoleOfUsers: [{ id: userResult.id }],
                startDate: null,
            });
        });
    });

    describe("delete", () => {
        it("removes relation if used on a subresource (XToOne)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository, routeOptions);

            const values = { title: "Join item on parent" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "role");
            subresourceRelation.id = userResult.id;

            const createResult = (await roleCtrl.create({
                values,
                subresourceRelations: [subresourceRelation],
            })) as Role;

            // Role should have been joined on user
            expect(createResult).toEqual({
                id: 1,
                title: values.title,
                mainRoleOfUsers: [{ id: userResult.id }],
                startDate: null,
            });

            await roleCtrl.delete({ entityId: createResult.id, subresourceRelations: [subresourceRelation] });

            const result = await roleCtrl.getDetails({ entityId: createResult.id });
            // Role should have been unset on this user
            expect(result).toEqual({
                id: 1,
                mainRoleOfUsers: [],
                startDate: null,
                title: "Join item on parent",
            });
        });

        it("removes relation if used on a subresource (XToMany)", async () => {
            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository, routeOptions);
            const userResult = (await userCtrl.create({ values: { name: "Alex", email: "alex@mail.com" } })) as User;

            const articleRepository = getRepository(Article);
            const articleCtrl = new RouteController(articleRepository, routeOptions);

            const values = { title: "Join item on parent" };
            const subresourceRelation = getSubresourceRelation(User, getRepository(User).metadata, "articles");
            subresourceRelation.id = userResult.id;

            const createResult = (await articleCtrl.create({
                values,
                subresourceRelations: [subresourceRelation],
            })) as Article;

            // User should have been joined on article
            expect(createResult).toEqual({
                id: 1,
                title: values.title,
                author: { id: userResult.id },
            });

            await articleCtrl.delete({ entityId: createResult.id, subresourceRelations: [subresourceRelation] });

            const result = await articleCtrl.getDetails({ entityId: createResult.id });
            // User should have been unset on this article
            expect(result).toEqual({
                id: 1,
                author: null,
                title: "Join item on parent",
            });
        });
    });
});
