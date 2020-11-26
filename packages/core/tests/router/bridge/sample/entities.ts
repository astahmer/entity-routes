import { IsString } from "class-validator";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { EntityRoute, Groups, Subresource } from "@/index";

export const getTestEntities = () => [User, Article, Comment, Upvote, Image, Role];

class AbstractEntity {
    @Groups("all")
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute()
@Entity()
class Image extends AbstractEntity {
    @Groups("all")
    @Column()
    url: string;

    @Subresource(() => Upvote)
    @OneToMany(() => Upvote, (upvote) => upvote.image)
    upvotes: () => Upvote[]; // wrap in fn to avoid ReferenceError: Cannot access 'Upvote' before initialization

    @OneToMany(() => Role, (role) => role.logo)
    logoOfRoles: () => Role; // wrap in fn to avoid ReferenceError: Cannot access 'Role' before initialization
}

@EntityRoute()
@Entity()
class Role extends AbstractEntity {
    @Groups("all")
    @Column()
    label: string;

    @Subresource(() => Image)
    @ManyToOne(() => Image, (image) => image.logoOfRoles)
    logo: Image;

    @OneToMany(() => User, (user) => user.mainRole)
    mainRoleOfUsers: () => User;
}

@EntityRoute({ operations: ["create", "update", "details", "list", "delete"] })
@Entity()
class User extends AbstractEntity {
    @Groups("all")
    @IsString()
    @Column()
    name: string;

    @Subresource(() => Article, { maxDepth: 3 })
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];

    @Subresource(() => Role, { maxDepth: 3 })
    @ManyToOne(() => Role, (role) => role.mainRoleOfUsers)
    mainRole: Role;
}

@EntityRoute({ operations: ["details"] })
@Entity()
class Article extends AbstractEntity {
    @Groups({ article: ["create"] })
    @Column()
    title: string;

    @Subresource(() => User)
    @ManyToOne(() => User, (user) => user.articles)
    author: User;

    @Subresource(() => Comment)
    @OneToMany(() => Comment, (comment) => comment.article)
    comments: Comment[];
}

@EntityRoute()
@Entity()
class Comment extends AbstractEntity {
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
class Upvote extends AbstractEntity {
    @ManyToOne(() => Comment, (comment) => comment.upvotes)
    comment: Comment;

    @ManyToOne(() => Image, (image) => image.upvotes)
    image: Image;
}

export const expectedRouteNames = [
    "user_create",
    "user_create_mapping",
    "user_update",
    "user_update_mapping",
    "user_details",
    "user_details_mapping",
    "user_list",
    "user_list_mapping",
    "user_delete",
    "user_articles_create",
    "user_articles_list",
    "user_articles_delete",
    "user_articles_comments_list",
    "user_articles_comments_upvotes_list",
    "user_mainrole_create",
    "user_mainrole_details",
    "user_mainrole_delete",
    "user_mainrole_logo_details",
    "user_mainrole_logo_upvotes_list",
    "article_details",
    "article_details_mapping",
    "article_author_create",
    "article_author_details",
    "article_author_delete",
    "article_author_mainrole_details",
    "article_comments_create",
    "article_comments_list",
    "article_comments_delete",
    "article_comments_upvotes_list",
    "comment_upvotes_create",
    "comment_upvotes_list",
    "comment_upvotes_delete",
    "image_upvotes_create",
    "image_upvotes_list",
    "image_upvotes_delete",
    "role_logo_create",
    "role_logo_details",
    "role_logo_delete",
    "role_logo_upvotes_list",
];

export const expectedRouteDesc = [
    "/user : post",
    "/user/mapping : post",
    "/user/:id(\\d+) : put",
    "/user/:id(\\d+)/mapping : put",
    "/user/:id(\\d+) : get",
    "/user/:id(\\d+)/mapping : get",
    "/user : get",
    "/user/mapping : get",
    "/user/:id(\\d+) : delete",
    "/user/:UserId(\\d+)/articles : post",
    "/user/:UserId(\\d+)/articles : get",
    "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
    "/user/:UserId(\\d+)/articles/comments : get",
    "/user/:UserId(\\d+)/articles/comments/upvotes : get",
    "/user/:UserId(\\d+)/mainRole : post",
    "/user/:UserId(\\d+)/mainRole : get",
    "/user/:UserId(\\d+)/mainRole : delete",
    "/user/:UserId(\\d+)/mainRole/logo : get",
    "/user/:UserId(\\d+)/mainRole/logo/upvotes : get",
    "/article/:id(\\d+) : get",
    "/article/:id(\\d+)/mapping : get",
    "/article/:ArticleId(\\d+)/author : post",
    "/article/:ArticleId(\\d+)/author : get",
    "/article/:ArticleId(\\d+)/author : delete",
    "/article/:ArticleId(\\d+)/author/mainRole : get",
    "/article/:ArticleId(\\d+)/comments : post",
    "/article/:ArticleId(\\d+)/comments : get",
    "/article/:ArticleId(\\d+)/comments/:id(\\d+) : delete",
    "/article/:ArticleId(\\d+)/comments/upvotes : get",
    "/comment/:CommentId(\\d+)/upvotes : post",
    "/comment/:CommentId(\\d+)/upvotes : get",
    "/comment/:CommentId(\\d+)/upvotes/:id(\\d+) : delete",
    "/image/:ImageId(\\d+)/upvotes : post",
    "/image/:ImageId(\\d+)/upvotes : get",
    "/image/:ImageId(\\d+)/upvotes/:id(\\d+) : delete",
    "/role/:RoleId(\\d+)/logo : post",
    "/role/:RoleId(\\d+)/logo : get",
    "/role/:RoleId(\\d+)/logo : delete",
    "/role/:RoleId(\\d+)/logo/upvotes : get",
];
