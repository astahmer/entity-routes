import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository } from "typeorm";
import { AliasHandler } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";

describe("AliasHandler", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        title: string;
    }

    @Entity()
    class User extends AbstractEntity {
        @Column()
        name: string;

        @ManyToOne(() => Role)
        role: Role;
    }

    beforeAll(() => createTestConnection([Role, User]));
    afterAll(closeTestConnection);

    it("generate", () => {
        const metadata = getRepository(User).metadata;
        const manager = new AliasHandler();
        const alias = manager.generate(metadata.tableName, "role");

        expect(alias).toEqual(metadata.tableName + "_role_1");
        expect(manager.aliases).toEqual({ "user.role": 1 });
    });

    it("getPropertyLastAlias", () => {
        const metadata = getRepository(User).metadata;
        const manager = new AliasHandler();

        expect(manager.generate(metadata.tableName, "role")).toEqual(
            manager.getPropertyLastAlias(metadata.tableName, "role")
        );
        expect(manager.generate(metadata.tableName, "role")).toEqual(
            manager.getPropertyLastAlias(metadata.tableName, "role")
        );
        expect(manager.aliases).toEqual({ "user.role": 2 });
    });

    // TODO
    // it("isJoinAlreadyMade", () => {});

    // TODO
    // it("getAliasForRelation", () => {});
});
