import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, getRepository } from "typeorm";

import { closeTestConnection, createTestConnection } from "@@/testConnection";
import { AliasHandler } from "@/index";

describe("AliasHandler", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Config extends AbstractEntity {
        @Column()
        label: string;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        title: string;

        @ManyToOne(() => Config)
        config: Config;
    }

    @Entity()
    class User extends AbstractEntity {
        @Column()
        name: string;

        @ManyToOne(() => Role)
        role: Role;
    }

    beforeAll(() => createTestConnection([Role, User, Config]));
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

    it("isJoinAlreadyMade", () => {
        const qb = getRepository(User).createQueryBuilder("user");
        const handler = new AliasHandler();

        const userRoleRelation = getRepository(User).metadata.relations.find((rel) => rel.propertyName === "role");
        const roleConfigRelation = getRepository(Role).metadata.relations.find((rel) => rel.propertyName === "config");

        qb.leftJoin("user.role", "user_role");

        expect(handler.isJoinAlreadyMade(qb, userRoleRelation)).toBeDefined();
        expect(handler.isJoinAlreadyMade(qb, roleConfigRelation)).toBeUndefined();
    });

    it("isJoinAlreadyMade - using prevAlias", () => {
        const qb = getRepository(User).createQueryBuilder("user");
        const handler = new AliasHandler();

        const roleConfigRelation = getRepository(Role).metadata.relations.find((rel) => rel.propertyName === "config");

        qb.leftJoin("user.role", "user_role");
        qb.leftJoin("user_role.config", "user_role_config");

        expect(handler.isJoinAlreadyMade(qb, roleConfigRelation, "user_role")).toBeDefined();
    });

    it("getAliasForRelation", () => {
        const qb = getRepository(User).createQueryBuilder("user");
        const handler = new AliasHandler();

        const userRoleRelation = getRepository(User).metadata.relations.find((rel) => rel.propertyName === "role");

        // It generates an alias and then returns the same alias when asked again with the same parameters
        expect(Object.keys(handler.aliases).length).toBe(0);
        const firstAlias = handler.getAliasForRelation(qb, userRoleRelation);
        expect(firstAlias.isJoinAlreadyMade).toBeUndefined();
        expect(firstAlias.alias).toEqual("user_role_1");

        qb.leftJoin("user.role", "user_role");

        const secondAlias = handler.getAliasForRelation(qb, userRoleRelation);
        expect(Object.keys(handler.aliases).length).toBe(1);
        expect(secondAlias.isJoinAlreadyMade).toBeDefined();
        expect(secondAlias.alias).toEqual("user_role_1");
    });
});
