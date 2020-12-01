import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { DependsOn, Groups, Subresource, makeEntity } from "@entity-routes/core";

export const getWriterTestEntities = () => [User, Role, Article, Comment, ThingWithComputed];

class AbstractEntity {
    @Groups(["list", "details"])
    @PrimaryGeneratedColumn()
    id: number;
}

@Entity()
export class Role extends AbstractEntity {
    @Column()
    title: string;

    @Column()
    startDate: Date;
}

export class SimpleThing {
    id: number;
}

@Entity()
export class ThingWithComputed extends AbstractEntity {
    @ManyToOne(() => Article, (article) => article.thingsWithComputed)
    article: () => Article; // wrap in fn to avoid ReferenceError: Cannot access 'Article' before initialization

    @DependsOn(["id"])
    @Groups("all")
    getIdentifier() {
        return `${this.id}_123456`;
    }
}

@Entity()
export class User extends AbstractEntity {
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

    @Groups({ user: "all" })
    @Column({ type: "simple-json" })
    thing: SimpleThing;

    @Groups({ user: "all" })
    getIdentifier() {
        return `${this.id}_${this.name}`;
    }
}

@Entity()
export class Article extends AbstractEntity {
    @Column()
    title: string;

    @ManyToOne(() => User, (user) => user.articles)
    author: User;

    @OneToMany(() => ThingWithComputed, (thingWithComputed) => thingWithComputed.article)
    thingsWithComputed: ThingWithComputed[];
}

@Entity()
export class Comment extends AbstractEntity {
    @Column()
    message: string;

    @ManyToOne(() => User, (user) => user.comments)
    writer: User;
}

export const makeItem = () => {
    const role = makeEntity(Role, { id: 1, title: "Admin", startDate: new Date() });
    const article1 = makeEntity(Article, { id: 1 });
    const article2 = makeEntity(Article, { id: 2 });
    const item = makeEntity(User, {
        id: 1,
        name: "Alex",
        email: "email@test.com",
        role,
        articles: [article1, article2],
    });

    return item;
};
