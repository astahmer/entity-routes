import { IsEmail, IsString } from "class-validator";
import { Container } from "typedi";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, getRepository } from "typeorm";

import { closeTestConnection, createTestConnection } from "@@/testConnection";
import { Groups, Persistor, setEntityValidatorsDefaultOption } from "@/index";

describe("Persistor", () => {
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

    const persistor = Container.get(Persistor);

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

        const result = await persistor.saveItem({ ctx: { operation: "create", values }, rootMetadata });
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

        const result = await persistor.saveItem({ ctx: { operation: "create", values }, rootMetadata });

        expect(result).toEqual({
            hasValidationErrors: true,
            errors: {
                user: [{ currentPath: "", property: "email", constraints: { isEmail: "email must be an email" } }],
                role: [{ currentPath: "role", property: "title", constraints: { isString: "title must be a string" } }],
            },
        });

        return closeTestConnection();
    });

    it("saveItem - throw on empty item", async () => {
        await createTestConnection([User, Role]);

        const repository = getRepository(Role);
        const rootMetadata = repository.metadata;

        const values = new Role();
        values.title = "Admin";
        values.startDate = new Date();

        // Will throw cause no "create" groups are set on Role.title/startDate on Role.create context
        // Which will make values an empty object
        expect(() => persistor.saveItem({ ctx: { operation: "create", values }, rootMetadata })).rejects.toThrow();

        return closeTestConnection();
    });
});
