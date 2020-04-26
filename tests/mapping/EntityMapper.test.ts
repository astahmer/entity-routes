import { Entity, ManyToOne, Column, PrimaryGeneratedColumn, getRepository } from "typeorm";
import { getGroupsMetadata, Groups, formatGroupsMethodName } from "@/index";
import { createTestConnection, closeTestConnection } from "../testConnection";

describe("EntityGroupsMetadata", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        @Groups({ role: "all", user: ["details"] })
        title: string;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["create", "update"])
        @Groups({ user: ["details"], role: ["list"] })
        @Column()
        name: string;

        @ManyToOne(() => Role)
        @Groups({ user: ["details"] })
        role: Role;

        @Groups(["list", "details"], "identifier")
        getIdentifier() {
            return `${this.id}_${this.role.title}_${this.name}`;
        }
    }

    beforeAll(async () => createTestConnection([User, Role]));
    afterAll(closeTestConnection);

    it("should getExposedPropsOn", () => {
        const metadata = getGroupsMetadata(User);
        expect(metadata.getExposedPropsOn("details", metadata.entityMeta)).toEqual([
            formatGroupsMethodName("getIdentifier", "identifier"),
            "name",
            "role",
        ]);
    });

    it("should getSelectProps", () => {
        const metadata = getGroupsMetadata(User);
        const roleEntityMetadata = getRepository(Role).metadata;

        // Getting groups on User entity with "user" context on "details" operation
        expect(metadata.getSelectProps("details", metadata.entityMeta)).toEqual(["user.name"]);
        // Getting groups on User entity with "role" context on "details" operation
        expect(metadata.getSelectProps("details", roleEntityMetadata)).toEqual([]);

        // Getting groups on User entity with "role" context on "list" operation
        expect(metadata.getSelectProps("list", roleEntityMetadata)).toEqual(["user.name"]);
        expect(metadata.getSelectProps("list", roleEntityMetadata, true, "UserEntity")).toEqual(["UserEntity.name"]);
        expect(metadata.getSelectProps("list", roleEntityMetadata, false)).toEqual(["name"]);
    });

    it("should getRelationPropsMetas", () => {
        const metadata = getGroupsMetadata(User);
        const relationMetadatas = metadata.getRelationPropsMetas("details", metadata.entityMeta);
        expect(relationMetadatas.map((meta) => meta.propertyName)).toEqual(["role"]);
    });

    it("should getComputedProps", () => {
        const metadata = getGroupsMetadata(User);
        expect(metadata.getComputedProps("details", metadata.entityMeta)).toEqual([
            formatGroupsMethodName("getIdentifier", "identifier"),
        ]);
    });
});
