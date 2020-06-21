import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { EntityRoute, Groups, Subresource } from "@/index";
import { IsString } from "class-validator";

export class AbstractEntity {
    @Groups("all")
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute({ operations: ["create", "details", "list"] })
@Entity()
export class User extends AbstractEntity {
    @Groups("all")
    @IsString()
    @Column()
    name: string;

    @Subresource(() => Article)
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];
}

@EntityRoute({ operations: ["details"] })
@Entity()
export class Article extends AbstractEntity {
    @Column()
    title: string;

    @ManyToOne(() => User, (user) => user.articles)
    author: User;

    @Subresource(() => Comment)
    @OneToMany(() => Comment, (comment) => comment.article)
    comments: Comment[];
}

@EntityRoute()
@Entity()
export class Comment extends AbstractEntity {
    @Column()
    message: string;

    @ManyToOne(() => Article, (article) => article.comments)
    article: Article;
}
