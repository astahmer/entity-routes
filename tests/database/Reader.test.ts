import { Container } from "typedi";
import { Reader, Persistor, Groups, AliasHandler } from "@/index";
import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository } from "typeorm";
import { createTestConnection, closeTestConnection } from "@@/testConnection";
import { IsEmail } from "class-validator";

describe("Reader", () => {
    const reader = Container.get(Reader);
    const persistor = Container.get(Persistor);

    it("getCollection", async () => {
        class AbstractEntity {
            @Groups("all")
            @PrimaryGeneratedColumn()
            id: number;
        }

        @Entity()
        class Role extends AbstractEntity {
            @Groups({ role: "all", user: ["list"] })
            @Column()
            title: string;

            @Groups({ role: "all", user: ["list"] })
            @Column()
            startDate: Date;
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

            @Groups({ user: "all" })
            @ManyToOne(() => Role)
            role: Role | number;
        }

        await createTestConnection([User, Role]);

        const repository = getRepository(User);
        const rootMetadata = repository.metadata;
        const qb = repository.createQueryBuilder(repository.metadata.tableName);
        const aliasHandler = new AliasHandler();

        expect(await reader.getCollection({ entityMetadata: rootMetadata, qb, aliasHandler })).toEqual([[], 0]);

        const user = new User();
        user.name = "Alex";
        user.email = "alex@mail.com";

        const role = new Role();
        role.title = "Admin";
        role.startDate = new Date();

        user.role = role;

        const roleMetadata = getRepository(Role).metadata;
        const roleResult = (await persistor.saveItem({
            ctx: { operation: "create", values: role as any },
            rootMetadata: roleMetadata,
        })) as Role;

        user.role = roleResult.id;
        await persistor.saveItem({ ctx: { operation: "create", values: user as any }, rootMetadata });

        expect(await reader.getCollection({ entityMetadata: rootMetadata, qb, aliasHandler })).toEqual([
            [
                {
                    name: "Alex",
                    email: "alex@mail.com",
                    role: { id: 1, title: "Admin", startDate: role.startDate },
                    id: 1,
                },
            ],
            1,
        ]);

        return closeTestConnection();
    });

    it("getItem", async () => {
        class AbstractEntity {
            @Groups("all")
            @PrimaryGeneratedColumn()
            id: number;
        }

        @Entity()
        class Role extends AbstractEntity {
            @Groups({ role: "all", user: ["list"] })
            @Column()
            title: string;

            @Groups({ role: "all", user: ["list"] })
            @Column()
            startDate: Date;
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

            @Groups({ user: "all" })
            @ManyToOne(() => Role)
            role: Role | number;
        }

        await createTestConnection([User, Role]);

        const repository = getRepository(User);
        const rootMetadata = repository.metadata;
        const qb = repository.createQueryBuilder(repository.metadata.tableName);
        const aliasHandler = new AliasHandler();

        expect(() => reader.getItem({ entityMetadata: rootMetadata, qb, aliasHandler, entityId: 1 })).rejects.toThrow();

        const user = new User();
        user.name = "Alex";
        user.email = "alex@mail.com";

        const role = new Role();
        role.title = "Admin";
        role.startDate = new Date();

        user.role = role;

        const roleMetadata = getRepository(Role).metadata;
        const roleResult = (await persistor.saveItem({
            ctx: { operation: "create", values: role as any },
            rootMetadata: roleMetadata,
        })) as Role;

        user.role = roleResult.id;
        await persistor.saveItem({ ctx: { operation: "create", values: user as any }, rootMetadata });

        expect(await reader.getItem({ entityMetadata: rootMetadata, qb, aliasHandler, entityId: 1 })).toEqual({
            email: "alex@mail.com",
            id: 1,
            name: "Alex",
            role: { id: 1, startDate: role.startDate, title: role.title },
        });

        return closeTestConnection();
    });
});
