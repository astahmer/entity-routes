import { Container } from "typedi";
import { Groups, Denormalizer, setEntityValidatorsDefaultOption } from "@/index";
import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository } from "typeorm";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { IsString, IsEmail } from "class-validator";

describe("Denormalizer", () => {
    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ user: "all" })
        @IsString()
        @Column()
        title: string;

        @Groups({ user: "all" })
        @Column()
        startDate: Date;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["details"])
        @Groups({ user: "all" })
        @Column()
        name: string;

        @Groups({ user: "all" })
        @IsEmail()
        @Column()
        email: string;

        @ManyToOne(() => Role, { cascade: true })
        @Groups({ user: "all" })
        role: Role;
    }

    const denormalizer = Container.get(Denormalizer);

    it("saveItem - inserts new item", async () => {
        await createTestConnection([User, Role]);

        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@mail.com";

        const role = new Role();
        role.title = "Admin";
        role.startDate = new Date();

        values.role = role;

        const result = await denormalizer.saveItem({ ctx: { operation: "create", values }, rootMetadata });
        expect(result).toEqual({
            name: "Alex",
            email: "alex@mail.com",
            role: { title: "Admin", startDate: role.startDate, id: 1 },
            id: 1,
        });

        return closeTestConnection();
    });

    it("saveItem - with validation errors", async () => {
        const entities = [User, Role];
        await createTestConnection(entities);
        setEntityValidatorsDefaultOption(entities);

        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "invalid mail";

        const role = new Role();
        role.title = 123 as any;
        role.startDate = new Date(); // invalid date

        values.role = role;

        const result = await denormalizer.saveItem({ ctx: { operation: "create", values }, rootMetadata });

        expect(result).toEqual({
            hasValidationErrors: true,
            errors: {
                user: [{ currentPath: "", property: "email", constraints: { isEmail: "email must be an email" } }],
                role: [{ currentPath: "role", property: "title", constraints: { isString: "title must be a string" } }],
            },
        });

        return closeTestConnection();
    });
});
