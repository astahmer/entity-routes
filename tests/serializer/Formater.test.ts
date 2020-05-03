import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository, OneToMany } from "typeorm";
import { Groups, DependsOn, Formater, Subresource } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";

describe("Formater", () => {
    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Column()
        title: string;

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
        @Column()
        email: string;

        @ManyToOne(() => Role)
        @Groups({ user: "all" })
        role: Role;

        @Groups({ user: "all" })
        @OneToMany(() => Article, (article) => article.author)
        articles: Article[];

        @Subresource(() => Comment)
        @OneToMany(() => Comment, (comment) => comment.writer)
        comments: Comment[];

        @DependsOn(["id", "name"])
        @Groups({ user: "all" })
        getIdentifier() {
            return `${this.id}_${this.name}`;
        }
    }

    @Entity()
    class Article extends AbstractEntity {
        @Column()
        title: string;

        @ManyToOne(() => User, (user) => user.articles)
        author: User;
    }

    @Entity()
    class Comment extends AbstractEntity {
        @Column()
        message: string;

        @ManyToOne(() => User, (user) => user.comments)
        writer: User;
    }

    beforeAll(async () => createTestConnection([Role, User, Article, Comment]));
    afterAll(closeTestConnection);

    it("formatItem properly", async () => {
        const entityMetadata = getRepository(User).metadata;
        const formater = Container.get(Formater) as Formater<User>;

        const item = new User();
        item.id = 1;
        item.name = "Alex";
        item.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = new Date();

        const article1 = new Article();
        article1.id = 1;

        const article2 = new Article();
        article2.id = 2;

        item.role = role;
        item.articles = [article1, article2];

        const formated = await formater.formatItem({ item, operation: "details", entityMetadata });
        // Computed prop (identifier) should have been added and keys sorted alphabetically
        expect(formated).toEqual({
            articles: [{ id: 1 }, { id: 2 }],
            email: "email@test.com",
            id: 1,
            identifier: "1_Alex",
            name: "Alex",
            role: { id: 1, startDate: role.startDate, title: "Admin" },
        });

        const formatedWithSubresource = await formater.formatItem({
            item,
            operation: "details",
            entityMetadata,
            options: { shouldSetSubresourcesIriOnItem: true },
        });
        // Subresource (comments) should have been added
        expect(formatedWithSubresource.comments).toEqual("/user/1/comments");

        const formatedWithFlatIri = await formater.formatItem({
            item,
            operation: "details",
            entityMetadata,
            options: { shouldEntityWithOnlyIdBeFlattenedToIri: true },
        });
        // Articles should have been flattened to iri
        expect(formatedWithFlatIri.articles).toEqual(["/article/1", "/article/2"]);
    });
});
