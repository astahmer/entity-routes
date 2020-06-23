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

    @Subresource(() => Article, { maxDepth: 3 })
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];
}

@EntityRoute({ operations: ["details"] })
@Entity()
export class Article extends AbstractEntity {
    @Groups({ article: ["create"] })
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
    @Groups({ comment: ["create"] })
    @Column()
    message: string;

    @ManyToOne(() => Article, (article) => article.comments)
    article: Article;

    @Subresource(() => Upvote)
    @OneToMany(() => Upvote, (upvote) => upvote.comment)
    upvotes: Upvote[];
}

@EntityRoute()
@Entity()
export class Upvote extends AbstractEntity {
    @ManyToOne(() => Comment, (comment) => comment.upvotes)
    comment: Comment;
}

export const expectedRouteNames = [
    "user_create",
    "user_create_mapping",
    "user_details",
    "user_details_mapping",
    "user_list",
    "user_list_mapping",
    "user_articles_create",
    "user_articles_list",
    "user_articles_delete",
    "user_articles_comments_list",
    "user_articles_comments_upvotes_list",
    "article_details",
    "article_details_mapping",
    "article_comments_create",
    "article_comments_list",
    "article_comments_delete",
    "article_comments_upvotes_list",
    "comment_upvotes_create",
    "comment_upvotes_list",
    "comment_upvotes_delete",
];

export const expectedRouteDesc = [
    "/user : post",
    "/user/mapping : post",
    "/user/:id(\\d+) : get",
    "/user/:id(\\d+)/mapping : get",
    "/user : get",
    "/user/mapping : get",
    "/user/:UserId(\\d+)/articles : post",
    "/user/:UserId(\\d+)/articles : get",
    "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
    "/user/:UserId(\\d+)/articles/comments : get",
    "/user/:UserId(\\d+)/articles/comments/upvotes : get",
    "/article/:id(\\d+) : get",
    "/article/:id(\\d+)/mapping : get",
    "/article/:ArticleId(\\d+)/comments : post",
    "/article/:ArticleId(\\d+)/comments : get",
    "/article/:ArticleId(\\d+)/comments/:id(\\d+) : delete",
    "/article/:ArticleId(\\d+)/comments/upvotes : get",
    "/comment/:CommentId(\\d+)/upvotes : post",
    "/comment/:CommentId(\\d+)/upvotes : get",
    "/comment/:CommentId(\\d+)/upvotes/:id(\\d+) : delete",
];
