import {
    AliasHandler,
    DependsOn,
    Groups,
    RelationManager,
    Subresource,
    getSubresourceRelation,
} from "@entity-routes/core";
import { Container } from "typedi";
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    getRepository,
} from "typeorm";

import { closeTestConnection, createTestConnection } from "@/testConnection";

describe("RelationManager", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    describe("simple cases", () => {
        @Entity()
        class Image extends AbstractEntity {
            @Groups({ user: ["details"] })
            @Column()
            url: string;

            @ManyToOne(() => User, (user) => user.uploadedImages)
            uploader: () => User; // wrap it to avoid ReferenceError: Cannot access 'User' before initialization
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

            @Subresource(() => Role)
            @Groups({ user: ["details"] })
            @ManyToOne(() => Role)
            role: Role;

            @Groups({ user: ["details"] })
            @OneToOne(() => Image)
            @JoinColumn()
            profilePicture: Image;

            @Subresource(() => Image)
            @OneToMany(() => Image, (image) => image.uploader)
            uploadedImages: Image;

            @DependsOn(["role.category.name", "profilePicture.url"])
            @Groups({ user: ["list"] })
            getIdentifier() {
                return `${this.role.category.name}_${this.profilePicture.url}`;
            }
        }

        beforeAll(() => createTestConnection([Category, Role, Image, User]));
        afterAll(() => {
            // since entities differ between tests suites, metadata cached on MappingManager must be cleared
            Container.reset();
            return closeTestConnection();
        });

        const manager = Container.get(RelationManager);

        it("can make joins from prop path", () => {
            const aliasHandler = new AliasHandler();

            const repository = getRepository(User);
            const metadata = repository.metadata;
            const qb = repository.createQueryBuilder(metadata.tableName);

            const propPath = "role.category.picture.url";
            const props = propPath.split(".");
            const { entityAlias, propName, columnMeta } = manager.makeJoinsFromPropPath({
                qb,
                entityMetadata: metadata,
                propPath,
                currentProp: props[0],
                aliasHandler,
            });

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

        it("will return undefined values on unknown prop path", () => {
            jest.spyOn(console, "warn").mockImplementation(() => {});
            const aliasHandler = new AliasHandler();

            const repository = getRepository(User);
            const metadata = repository.metadata;
            const qb = repository.createQueryBuilder(metadata.tableName);

            const propPath = "role.category.c.d";
            const props = propPath.split(".");
            const { entityAlias, propName, columnMeta } = manager.makeJoinsFromPropPath({
                qb,
                entityMetadata: metadata,
                propPath,
                currentProp: props[0],
                aliasHandler,
            });

            // should have joined props untill reaching an unknown prop
            expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual([
                "user_role_1",
                "role_category_1",
            ]);
            expect(entityAlias).toEqual(undefined);
            expect(propName).toEqual(undefined);
            expect(columnMeta).toEqual(undefined);
        });

        it("can join and select exposed props", () => {
            const aliasHandler = new AliasHandler();
            const repository = getRepository(User);
            const metadata = repository.metadata;
            const qb = repository.createQueryBuilder(metadata.tableName);

            manager.joinAndSelectExposedProps({
                rootMetadata: metadata,
                operation: "details",
                qb,
                entityMetadata: metadata,
                currentPath: "",
                prevProp: metadata.tableName,
                options: {},
                aliasHandler,
            });

            // should have joined & selected every props that are exposed
            // on User entity (rootMetadata) & User context (metadata) for operation "details"
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
            const aliasHandler = new AliasHandler();
            const repository = getRepository(User);
            const metadata = repository.metadata;
            const qb = repository.createQueryBuilder(metadata.tableName);

            manager.joinAndSelectPropsThatComputedPropsDependsOn({
                rootMetadata: metadata,
                operation: "list",
                qb,
                entityMetadata: metadata,
                aliasHandler,
            });

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

        it("can join subresource on inverse side", () => {
            const repository = getRepository(User);
            const metadata = repository.metadata;

            const aliasHandler = new AliasHandler();
            const qb = repository.createQueryBuilder(metadata.tableName);
            const subresourceRelation = getSubresourceRelation(User, getRepository(Image).metadata, "uploader" as any);

            manager.joinSubresourceOnInverseSide({ qb, entityMetadata: metadata, aliasHandler, subresourceRelation });

            expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual(["user_uploadedImages_1"]);
        });

        it("can NOT join subresource when inverse side is missing", () => {
            const repository = getRepository(User);
            const metadata = repository.metadata;

            const aliasHandler = new AliasHandler();
            const qb = repository.createQueryBuilder(metadata.tableName);
            const subresourceRelation = getSubresourceRelation(User, metadata, "role");

            expect(() =>
                manager.joinSubresourceOnInverseSide({
                    qb,
                    entityMetadata: metadata,
                    aliasHandler,
                    subresourceRelation,
                })
            ).toThrow("Subresources require an inverseRelation to be set, missing for user.role");
        });
    });

    describe("max depth cases", () => {
        @Entity()
        class Image extends AbstractEntity {
            @Groups(["list"])
            @Column()
            title: string;

            @Groups(["list"])
            @ManyToOne(() => User)
            uploader: () => User; // wrap it to avoid ReferenceError: Cannot access 'User' before initialization
        }
        @Entity()
        class User extends AbstractEntity {
            @Groups(["list"])
            @Column()
            name: string;

            @Groups(["list"])
            @ManyToOne(() => Image)
            avatar: Image;
        }

        beforeAll(() => createTestConnection([Image, User]));
        afterAll(closeTestConnection);

        const manager = Container.get(RelationManager);

        it("isRelationPropCircular should return undefined when not circular", () => {
            const userMetadata = getRepository(User).metadata;
            const imageMetadata = getRepository(Image).metadata;
            const options = { isMaxDepthEnabledByDefault: true, defaultMaxDepthLvl: 2 };

            expect(
                manager.isRelationPropCircular({
                    currentPath: "user.image",
                    entityMetadata: imageMetadata,
                    relation: userMetadata.findRelationWithPropertyPath("avatar"),
                    options,
                })
            ).toEqual(undefined);
        });

        it("isRelationPropCircular should return prop & depth when circular", () => {
            const userMetadata = getRepository(User).metadata;
            const imageMetadata = getRepository(Image).metadata;
            const options = { isMaxDepthEnabledByDefault: true, defaultMaxDepthLvl: 2 };

            const circularOnUploader = manager.isRelationPropCircular({
                currentPath: "user.image.user",
                entityMetadata: userMetadata,
                relation: imageMetadata.findRelationWithPropertyPath("uploader"),
                options,
            });
            expect(circularOnUploader.prop).toEqual("uploader");
            expect(circularOnUploader.depth).toEqual(2);

            const circularOnAvatar = manager.isRelationPropCircular({
                currentPath: "user.image.user.image",
                entityMetadata: imageMetadata,
                relation: userMetadata.findRelationWithPropertyPath("avatar"),
                options,
            });
            expect(circularOnAvatar.prop).toEqual("avatar");
            expect(circularOnAvatar.depth).toEqual(2);

            const circularOnUploaderDeeper = manager.isRelationPropCircular({
                currentPath: "user.image.user.image.user",
                entityMetadata: userMetadata,
                relation: imageMetadata.findRelationWithPropertyPath("uploader"),
                options,
            });
            expect(circularOnUploaderDeeper.prop).toEqual("uploader");
            expect(circularOnUploaderDeeper.depth).toEqual(3);
        });

        it("joinAndSelectExposedProps - with shouldMaxDepthReturnRelationPropsId", () => {
            const repository = getRepository(User);
            const metadata = repository.metadata;

            const qb = repository.createQueryBuilder(metadata.tableName);
            const aliasHandler = new AliasHandler();

            manager.joinAndSelectExposedProps({
                rootMetadata: metadata,
                operation: "list",
                qb,
                entityMetadata: metadata,
                currentPath: "",
                prevProp: metadata.tableName,
                options: {
                    isMaxDepthEnabledByDefault: true,
                    defaultMaxDepthLvl: 3,
                    shouldMaxDepthReturnRelationPropsId: true,
                },
                aliasHandler,
            });

            expect(qb.expressionMap.joinAttributes.map((join) => join.alias.name)).toEqual([
                "user_avatar_1",
                "image_uploader_1",
                "image_uploader_2",
            ]);
            expect(qb.expressionMap.selects).toEqual([
                { selection: "user", aliasName: undefined },
                { selection: "user_avatar_1.title" },
                { selection: "user_avatar_1.id" },
                { selection: "image_uploader_1.name" },
                { selection: "image_uploader_1.id" },
                { selection: "user_avatar_1.title" },
                { selection: "user_avatar_1.id" },
                { selection: "image_uploader_2.id", aliasName: undefined },
            ]);
        });
    });
});
