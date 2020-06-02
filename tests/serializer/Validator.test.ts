import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository } from "typeorm";
import { Validator, RequestContext } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";
import { IsString, IsEmail, IsDate } from "class-validator";

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
});
