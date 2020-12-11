import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { EntityRoute } from "@entity-routes/core";

export class AbstractEntity {
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute()
@Entity()
export class Manager extends AbstractEntity {
    @Column()
    name: string;

    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];
}

@EntityRoute()
@Entity()
export class User extends AbstractEntity {
    @Column()
    name: string;

    @ManyToOne(() => Manager)
    manager: Manager;

    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];

    @OneToMany(() => Comment, (comment) => comment.writer)
    comments: Comment[];

    @OneToMany(() => Article, (article) => article.writers)
    articlesWritten: User[];
}

@EntityRoute()
@Entity()
export class Article extends AbstractEntity {
    @Column()
    title: string;

    @ManyToOne(() => User, (user) => user.articles)
    author: User;

    @OneToMany(() => Comment, (comment) => comment.article)
    comments: Comment[];

    @OneToMany(() => User, (user) => user.articlesWritten)
    writers: Comment[];
}

@EntityRoute()
@Entity()
export class Upvote extends AbstractEntity {
    @ManyToOne(() => User, (user) => user.comments)
    upvoter: User;

    @ManyToOne(() => Comment, (comment) => comment.upvotes)
    comment: () => Comment;
}

@EntityRoute()
@Entity()
export class Comment extends AbstractEntity {
    @Column()
    message: string;

    @ManyToOne(() => Article, (article) => article.comments)
    article: Article;

    @ManyToOne(() => User, (user) => user.comments)
    writer: User;

    @OneToMany(() => Upvote, (upvote) => upvote.comment)
    upvotes: Upvote[];
}
