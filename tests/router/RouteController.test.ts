import { Groups, RouteController, RequestContext, deepMerge, Search } from "@/index";
import { PrimaryGeneratedColumn, Entity, Column, getRepository, ManyToOne, DeepPartial } from "typeorm";
import { createTestConnection, closeTestConnection, makeTestCtx } from "@@/tests/testConnection";
import { IsString, IsDate } from "class-validator";

describe("RouteController", () => {
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
            const requestContext: RequestContext<User> = {
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values,
            };

            const result = await ctrl.create(requestContext);
            expect(result).toEqual({
                birthDate,
                id: 1,
                role: { id: 1, identifier: "ADM", name: "Admin" },
            });
        });

        it("returns error when body is empty", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository);

            const values = {};
            const requestContext: RequestContext<User> = {
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values,
            };

            const result = await ctrl.create(requestContext);
            expect(result).toEqual({ error: "Body can't be empty on create operation" });
        });

        it("returns validation errors when sending invalid values", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository);

            const birthDate = new Date();
            const values = {
                name: 123 as any, // invalid string
                birthDate,
                role: { identifier: "ADM", name: "Admin" },
            };
            const requestContext: RequestContext<User> = {
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values,
            };

            const result = await ctrl.create(requestContext, { validatorOptions: { noAutoGroups: true } });
            expect(result).toEqual({
                hasValidationErrors: true,
                errors: {
                    user: [{ currentPath: "", property: "name", constraints: { isString: "name must be a string" } }],
                },
            });
        });

        it("inserts item and/or join it to parent (XToOne)", async () => {
            return; // TODO
        });

        it("inserts item and/or add it in parent collection (XToMany)", async () => {
            return; // TODO
        });
    });

    describe("update", () => {
        it("updates item", async () => {
            const roleRepository = getRepository(Role);
            const roleCtrl = new RouteController(roleRepository);
            const modRole = await roleCtrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { identifier: "MOD", name: "Moderator" },
            });

            const userRepository = getRepository(User);
            const userCtrl = new RouteController(userRepository);

            const birthDate = new Date();
            const createResult = await userCtrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Alex", birthDate },
            });
            const updateResult = await userCtrl.update({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
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
            const userCtrl = new RouteController(userRepository);

            const birthDate = new Date();
            const createResult = await userCtrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Alex", birthDate },
            });
            const updateResult = await userCtrl.update(
                {
                    ctx: makeTestCtx(),
                    isUpdateOrCreate: true,
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
            const ctrl = new RouteController(repository);

            // Running sequentially to keep expected id
            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Alex", birthDate: new Date(), role: { identifier: "ADM", name: "Admin" } },
            });

            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Andre", birthDate: new Date(), role: { identifier: "MOD", name: "Moderator" } },
            });

            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Max", birthDate: new Date(), role: { identifier: "MAN", name: "Manager" } },
            });

            const result = await ctrl.getList({ ctx: makeTestCtx() });
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
            const ctrl = new RouteController(repository);

            // Running sequentially to keep expected id
            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Alex", birthDate: new Date(), role: { identifier: "ADM", name: "Admin" } },
            });

            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Andre", birthDate: new Date(), role: { identifier: "MOD", name: "Moderator" } },
            });

            await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Max", birthDate: new Date(), role: { identifier: "MAN", name: "Manager" } },
            });

            const result1 = await ctrl.getList({ ctx: makeTestCtx(), queryParams: { "name;contains": "x" } });
            expect(result1).toEqual({
                items: [
                    { id: 1, name: "Alex", role: { id: 1 } },
                    { id: 3, name: "Max", role: { id: 3 } },
                ],
                totalItems: 2,
            });

            const result2 = await ctrl.getList({
                ctx: makeTestCtx(),
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
        const ctrl = new RouteController(repository);

        const birthDate = new Date();
        const createResult = await ctrl.create({
            ctx: makeTestCtx(),
            isUpdateOrCreate: true,
            values: { name: "Alex", birthDate },
        });

        const result = await ctrl.getDetails({
            ctx: makeTestCtx(),
            isUpdateOrCreate: false,
            entityId: 1,
        });
        expect(result).toEqual(createResult);
    });

    describe("delete", () => {
        it("removes entity", async () => {
            const repository = getRepository(User);
            const ctrl = new RouteController(repository);

            const createResult = (await ctrl.create({
                ctx: makeTestCtx(),
                isUpdateOrCreate: true,
                values: { name: "Alex", birthDate: new Date() },
            })) as User;

            await ctrl.delete({ ctx: makeTestCtx(), entityId: createResult.id });

            expect(() =>
                ctrl.getDetails({
                    ctx: makeTestCtx(),
                    isUpdateOrCreate: true,
                    values: { name: "Alex", birthDate: new Date() },
                })
            ).rejects.toThrowError("Not found.");
        });

        it("removes relation if used on a subresource (XToOne)", async () => {
            //
        });

        it("removes relation if used on a subresource (XToMany)", async () => {
            //
        });
    });
});
