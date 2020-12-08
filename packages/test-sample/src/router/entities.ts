import { IsString } from "class-validator";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { EntityRoute, Groups, Subresource } from "@entity-routes/core";

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
