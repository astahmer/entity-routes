import { registerEntityDecorator } from "@astahmer/entity-validator";
import { RequestContext, Validator } from "@entity-routes/core";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";
import { IsDate, IsEmail, IsString, ValidationArguments, registerDecorator } from "class-validator";
import { Container } from "typedi";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, getRepository } from "typeorm";

describe("Validator", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    const validator = Container.get(Validator);

    it("validateItem properly", async () => {
        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;
        }

        await createTestConnection([User]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "invalid email";

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, { noAutoGroups: true });
        expect(errors).toEqual({
            user: [{ constraints: { isEmail: "email must be an email" }, currentPath: "", property: "email" }],
        });

        return closeTestConnection();
    });

    it("validateItem expects return to be an empty object if all validations passes", async () => {
        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;
        }

        await createTestConnection([User]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "email@test.com";

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, { noAutoGroups: true });
        expect(errors).toEqual({});

        return closeTestConnection();
    });

    it("validateItem using request context (which use auto validation groups from operation)", async () => {
        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail({}, { groups: ["invalidGroup"] })
            @Column()
            email: string;

            @IsDate({ always: true })
            @Column({ type: "date" })
            birthDate: Date;
        }

        await createTestConnection([User]);

        const values = new User();
        values.id = 1;
        values.name = 123 as any;
        values.email = "invalid mail";

        const rootMetadata = getRepository(User).metadata;
        const context: RequestContext = { ctx: undefined, operation: "create", values, isUpdateOrCreate: true };
        const errors = await validator.validateItem(rootMetadata, values, { context });
        // request context auto groups = ["user", "user_create"]

        // name will not return a validation error (despite being invalid)
        // since no groups match those from the request context it will not be checked
        // same goes for email prop
        expect(errors).toEqual({
            user: [
                {
                    currentPath: "",
                    property: "birthDate",
                    constraints: { isDate: "birthDate must be a Date instance" },
                },
            ],
        });

        return closeTestConnection();
    });

    it("recursively auto validates nested entity", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @IsString()
            @Column()
            title: string;

            @IsDate()
            @Column()
            startDate: Date;

            @IsDate()
            @Column()
            endDate: Date;
        }

        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = 123 as any; // invalid date
        role.endDate = new Date();

        values.role = role;

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, { noAutoGroups: true });
        expect(errors).toEqual({
            role: [
                {
                    currentPath: "role",
                    property: "startDate",
                    constraints: { isDate: "startDate must be a Date instance" },
                },
            ],
        });

        return closeTestConnection();
    });

    it("can opt-out of recursive validation with option", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @IsString()
            @Column()
            title: string;

            @IsDate()
            @Column()
            startDate: Date;

            @IsDate()
            @Column()
            endDate: Date;
        }

        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = 123 as any; // invalid date
        role.endDate = new Date();

        values.role = role;

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, {
            noAutoGroups: true,
            skipNestedEntities: true,
        });
        expect(errors).toEqual({});

        return closeTestConnection();
    });

    it("skip missing properties on updating a relation", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @IsString()
            @Column()
            title: string;

            @IsDate()
            @Column()
            startDate: Date;

            @IsDate()
            @Column()
            endDate: Date;
        }

        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "invalid email";

        const role = new Role();
        role.id = 123;
        values.role = role;

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, { noAutoGroups: true });
        expect(errors).toEqual({
            user: [{ constraints: { isEmail: "email must be an email" }, currentPath: "", property: "email" }],
        });

        return closeTestConnection();
    });

    it("should run nested validations in parallel async promises", async () => {
        @RoleValidator()
        @Entity()
        class Role extends AbstractEntity {
            @IsString()
            @Column()
            title: string;

            @IsDate()
            @Column()
            startDate: Date;

            @Column()
            endDate: Date;

            @ManyToOne(() => User, (user) => user.defaultRoles)
            users: User[];
        }
        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;

            @OneToMany(() => Role, (role) => role.id)
            defaultRoles: Role[];

            @RolePropValidator(777)
            @ManyToOne(() => Role)
            adminRole: Role;
        }

        function RoleValidator() {
            return (target: Function) => {
                registerEntityDecorator({
                    name: "RoleValidator",
                    target,
                    validator: (value: Role) => {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve(value.id !== 321);
                            }, 100);
                        });
                    },
                });
            };
        }

        function RolePropValidator(forbiddenId: number) {
            return (target: Object, propertyName: string) => {
                registerDecorator({
                    name: "RolePropValidator",
                    target: target.constructor,
                    propertyName,
                    constraints: [forbiddenId],
                    options: { message: "That id ($constraint1) is forbidden as a Role" },
                    validator: {
                        validate(value: Role, args: ValidationArguments) {
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve(!args.constraints.includes(value.id));
                                }, 100);
                            });
                        },
                    },
                });
            };
        }

        await createTestConnection([User, Role]);

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "invalid email";

        const role = new Role();
        role.id = 123;
        role.title = "abc";
        role.startDate = new Date();

        const role2 = new Role();
        role2.id = 456;
        role2.title = "def";
        // will fail since startDate is missing

        const role3 = new Role();
        role3.id = 321; // will fail as normal validationError cause of id === 321
        role3.title = "fail";
        role3.startDate = new Date();

        const role4 = new Role();
        role4.id = 777; // will fail promise cause of id === 777
        role4.title = "fail";
        role4.startDate = new Date();

        values.role = role;
        values.defaultRoles = [role2, role3];
        values.adminRole = role4;

        const rootMetadata = getRepository(User).metadata;
        const errors = await validator.validateItem(rootMetadata, values, { noAutoGroups: true });

        expect(errors).toEqual({
            user: [
                {
                    currentPath: "",
                    property: "email",
                    constraints: { isEmail: "email must be an email" },
                },
                {
                    currentPath: "",
                    property: "adminRole",
                    constraints: { RolePropValidator: "That id (777) is forbidden as a Role" },
                },
            ],
            "defaultRoles[0]": [
                {
                    currentPath: "defaultRoles[0]",
                    property: "startDate",
                    constraints: { isDate: "startDate must be a Date instance" },
                },
            ],
            "defaultRoles[1]": [
                {
                    currentPath: "defaultRoles[1]",
                    property: "class",
                    constraints: {
                        RoleValidator: "Failed validation cause of constraint 'RoleValidator'",
                    },
                },
            ],
        });

        return closeTestConnection();
    });
});
