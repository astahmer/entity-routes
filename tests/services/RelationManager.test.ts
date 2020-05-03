import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository, OneToOne, JoinColumn } from "typeorm";
import { Groups, AliasManager, RelationManager, DependsOn } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";

describe("AliasManager", () => {
    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Image extends AbstractEntity {
        @Groups({ user: ["details"] })
        @Column()
        url: string;
    }

    @Entity()
    class Category extends AbstractEntity {
        @Groups({ user: ["details"] })
        @Column()
        name: string;

        @Groups({ user: ["details"] })
        @OneToOne(() => Image)
        picture: Image;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ user: ["details", "list"] })
        @Column()
        title: string;

        @Groups({ user: ["details", "list"] })
        @ManyToOne(() => Category)
        category: Category;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups({ user: ["details", "list"] })
        @Column()
        name: string;

        @Groups({ user: ["details"] })
        @ManyToOne(() => Role)
        role: Role;

        @Groups({ user: ["details"] })
        @OneToOne(() => Image)
        @JoinColumn()
        profilePicture: Image;

        @DependsOn(["role.category.name", "profilePicture.url"])
        @Groups({ user: ["list"] })
        getIdentifier() {
            return `${this.role.category.name}_${this.profilePicture.url}`;
        }
    }

    beforeAll(async () => createTestConnection([Category, Role, Image, User]));
    afterAll(closeTestConnection);
    it("can make joins from prop path", () => {
        const aliasManager = new AliasManager();
        const manager = Container.get(RelationManager);

        const repository = getRepository(User);
        const metadata = repository.metadata;
        const qb = repository.createQueryBuilder(metadata.tableName);

        const propPath = "role.category.picture.url";
        const props = propPath.split(".");
        const { entityAlias, propName, columnMeta } = manager.makeJoinsFromPropPath(
            qb,
            metadata,
            propPath,
            props[0],
            aliasManager
        );

        // should have joined every prop leading to last section of prop path
        expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual([
            "user_role_1",
            "role_category_1",
            "category_picture_1",
        ]);
        expect(entityAlias).toEqual("category_picture_1");
        expect(propName).toEqual("url");
        expect(columnMeta.propertyName).toEqual("url");
    });

    it("can join and select exposed props", () => {
        const aliasManager = new AliasManager();
        const manager = Container.get(RelationManager);

        const repository = getRepository(User);
        const metadata = repository.metadata;
        const qb = repository.createQueryBuilder(metadata.tableName);

        manager.joinAndSelectExposedProps(metadata, "details", qb, metadata, "", metadata.tableName, {}, aliasManager);

        // should have joined & selected every props that is exposed on User entity (rootMetadata) & User context (metadata) for operation "details"
        expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual([
            "user_role_1",
            "role_category_1",
            "category_picture_1",
            "user_profilePicture_1",
        ]);
        expect(qb.expressionMap.selects).toEqual([
            { selection: "user", aliasName: undefined },
            { selection: "user_role_1.title" },
            { selection: "user_role_1.id" },
            { selection: "role_category_1.name" },
            { selection: "role_category_1.id" },
            { selection: "category_picture_1.url" },
            { selection: "category_picture_1.id" },
            { selection: "user_profilePicture_1.url" },
            { selection: "user_profilePicture_1.id" },
        ]);
    });

    it("can join and select props that computed props depends on", () => {
        const aliasManager = new AliasManager();
        const manager = Container.get(RelationManager);

        const repository = getRepository(User);
        const metadata = repository.metadata;
        const qb = repository.createQueryBuilder(metadata.tableName);

        manager.joinAndSelectPropsThatComputedPropsDependsOn(metadata, "list", qb, metadata, aliasManager);

        // should have joined & selected every props from @DependsOn of getIdentifier computed prop
        expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual([
            "user_role_1",
            "role_category_1",
            "user_profilePicture_1",
        ]);
        expect(qb.expressionMap.selects).toEqual([
            { selection: "user", aliasName: undefined },
            { selection: "role_category_1.name" },
            { selection: "user_profilePicture_1.url" },
        ]);
    });

    // TODO joinSubresourceOnInverseSide
    // it("can join subresource on inverse side", () => {});
});
