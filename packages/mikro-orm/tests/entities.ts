import { Entity, ManyToOne, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { IsString } from "class-validator";

import { EntityRoute, Groups, Subresource } from "@entity-routes/core";

export const getTestEntities = () => [User, Article, Comment, Upvote, Image, Role];

class AbstractEntity {
    @Groups("all")
    @PrimaryKey()
    id: number;
}

@EntityRoute()
@Entity()
class Image extends AbstractEntity {
    @Groups("all")
    @Property()
    url: string;

    @Subresource(() => Upvote)
    @OneToMany(() => Upvote, (upvote) => upvote.image)
    upvotes: Upvote[]; // wrap in fn to avoid ReferenceError: Cannot access 'Upvote' before initialization

    @OneToMany(() => Role, (role) => role.logo)
    logoOfRoles: Role; // wrap in fn to avoid ReferenceError: Cannot access 'Role' before initialization
}

@EntityRoute()
@Entity()
class Role extends AbstractEntity {
    @Groups("all")
    @Property()
    label: string;

    @Subresource(() => Image)
    @ManyToOne(() => Image)
    logo: Image;

    @OneToMany(() => User, (user) => user.mainRole)
    mainRoleOfUsers: User;
}

@EntityRoute({ operations: ["create", "update", "details", "list", "delete"] })
@Entity()
class User extends AbstractEntity {
    @Groups("all")
    @IsString()
    @Property()
    name: string;

    @Subresource(() => Article, { maxDepth: 3 })
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];

    @Subresource(() => Role, { maxDepth: 3 })
    @ManyToOne(() => Role)
    mainRole: Role;
}

@EntityRoute({ operations: ["details"] })
@Entity()
class Article extends AbstractEntity {
    @Groups({ article: ["create"] })
    @Property()
    title: string;

    @Subresource(() => User)
    @ManyToOne(() => User)
    author: User;

    @Subresource(() => Comment)
    @OneToMany(() => Comment, (comment) => comment.article)
    comments: Comment[];
}

@EntityRoute({ operations: ["details", "delete"] })
@Entity()
class Comment extends AbstractEntity {
    @Groups({ comment: ["create"] })
    @Property()
    message: string;

    @ManyToOne(() => Article)
    article: Article;

    @Subresource(() => Upvote)
    @OneToMany(() => Upvote, (upvote) => upvote.comment)
    upvotes: Upvote[];
}

@EntityRoute()
@Entity()
class Upvote extends AbstractEntity {
    @ManyToOne(() => Comment)
    comment: Comment;

    @ManyToOne(() => Image)
    image: Image;
}
