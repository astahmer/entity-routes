import { MappingManager, MappingItem, ENTITY_META_SYMBOL } from "@/services/MappingManager";
import { Container } from "typedi";
import { Entity, Column, getRepository, ManyToOne, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { EntityGroupsMetadata, Groups, GROUPS_METAKEY } from "@/index";

describe("MappingManager", () => {
    const manager = Container.get(MappingManager);

    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        @Groups({ role: "all", user: ["details"], article: ["details"] })
        title: string;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["create", "update"])
        @Groups({ user: ["details"], role: ["list"], article: ["details"] })
        @Column()
        name: string;

        @ManyToOne(() => Role)
        @Groups({ user: ["details"], article: ["details"] })
        role: Role;

        @OneToMany(() => Article, (article) => article.writer)
        articles: Article[];

        @Groups(["list", "details"], "identifier")
        getIdentifier() {
            return `${this.id}_${this.role.title}_${this.name}`;
        }
    }

    type SimpleCategory = { name: string; description: string };

    @Entity()
    class Article extends AbstractEntity {
        @Column()
        title: string;

        @Column({ type: "simple-array" })
        tags: string[];

        @Column({ type: "simple-json" })
        category: SimpleCategory;

        @Groups({ article: ["details"] })
        @ManyToOne(() => User, (user) => user.articles)
        writer: User;
    }

    beforeAll(async () => createTestConnection([Article, Role, User]));
    afterAll(closeTestConnection);

    it("can retrieve groups metadata from entity metadata", () => {
        const metadata = getRepository(Article).metadata;
        const groupsMeta = manager.getGroupsMetadataFor(metadata, EntityGroupsMetadata);

        expect(groupsMeta).toBeDefined();
        expect(groupsMeta).toBeInstanceOf(EntityGroupsMetadata);
        expect(groupsMeta.metaKey).toEqual(GROUPS_METAKEY);
    });

    it("make mapping", () => {
        const metadata = getRepository(User).metadata;
        const operation = "details";
        const userMapping = manager.make(metadata, operation) as MappingItem;

        const groupsMeta = manager.getGroupsMetadataFor(metadata, EntityGroupsMetadata);

        const [selectProps, relationProps, computedProps] = [
            groupsMeta.getSelectProps(operation, metadata, false),
            groupsMeta.getRelationPropsMetas(operation, metadata).map((rel) => rel.propertyName),
            groupsMeta.getComputedProps(operation, metadata),
        ];
        const exposedProps = selectProps.concat(relationProps).filter((prop) => !computedProps.includes(prop));

        // Mapping.selectProps === groupsMeta.getSelectProps() === MappingManager.getSelectProps()
        expect(userMapping.selectProps).toEqual(selectProps);
        expect(userMapping.selectProps).toEqual(manager.getSelectProps(metadata, operation, metadata, false));

        // Mapping.relationProps === groupsMeta.getRelationProps() === MappingManager.getRelationProps()
        expect(userMapping.relationProps).toEqual(relationProps);
        expect(userMapping.relationProps).toEqual(
            manager.getRelationPropsMetas(metadata, operation, metadata).map((rel) => rel.propertyName)
        );

        // Mapping.selectProps === MappingManager.getComputedProps()
        expect(computedProps).toEqual(manager.getComputedProps(metadata, operation, metadata));

        // Mapping.exposedProps === groupsMeta.getExposedProps() === MappingManager.getExposedProps()
        expect(userMapping.exposedProps).toEqual(exposedProps);
        expect(userMapping.exposedProps).toIncludeAllMembers(
            manager.getExposedProps(metadata, operation, metadata).filter((prop) => !computedProps.includes(prop))
        );

        // User.role exposes (Role.)title & (AbstractEntity.)id
        expect(userMapping.mapping["role"].exposedProps).toEqual(["title", "id"]);
    });

    it("make pretty mapping", () => {
        const metadata = getRepository(User).metadata;
        const operation = "details";
        const mapping = manager.make(metadata, operation, { pretty: true });

        expect(mapping).toEqual({
            id: "Number",
            name: "String",
            role: { id: "Number", title: "String" },
        });
    });

    it("get nested mapping at", () => {
        const metadata = getRepository(Article).metadata;
        const operation = "details";
        const articleMapping = manager.make(metadata, operation) as MappingItem;
        const roleMapping = manager.getNestedMappingAt("writer.role", articleMapping);

        expect(roleMapping).toBeDefined();
        expect(roleMapping[ENTITY_META_SYMBOL].name).toEqual("Role");
        expect(roleMapping.selectProps).toEqual(["title", "id"]);
    });

    it("can detect 'simple-x' prop from entity metadata", () => {
        const metadata = getRepository(Article).metadata;
        expect(manager.isPropSimple(metadata, "title")).toEqual(false);
        expect(manager.isPropSimple(metadata, "tags")).toEqual(true);
        expect(manager.isPropSimple(metadata, "category")).toEqual(true);
    });
});
