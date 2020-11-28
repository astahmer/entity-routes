import { CRUD_OPERATIONS, EntityRoute, Groups, Subresource } from "@entity-routes/core";
import { Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export const getOpenApiTestEntities = () => [Image, Role, User, Article, Comment, Upvote];

class AbstractEntity {
    @Groups("all")
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute()
@Entity()
class Image extends AbstractEntity {
    @Groups(["list", "details"])
    @Column()
    url: string;
}

@EntityRoute({ operations: CRUD_OPERATIONS })
@Entity()
class Role extends AbstractEntity {
    @Groups({ role: "basic" })
    @Column()
    title: string;

    @Groups({ role: "basic" })
    @ManyToOne(() => Image)
    logo: Image;

    @Subresource(() => User)
    @ManyToMany(() => User, (user) => user.roles)
    users: () => User; // wrap in fn to avoid ReferenceError: Cannot access 'User' before initialization
}

@EntityRoute({ operations: CRUD_OPERATIONS })
@Entity()
class User extends AbstractEntity {
    @Groups({ user: "basic", article: ["list", "details"] })
    @Column()
    name: string;

    @Groups({ user: "basic", article: ["list", "details"] })
    @ManyToOne(() => Image)
    avatar: Image;

    @Subresource(() => Article)
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];

    @Groups({ user: ["details"] })
    @Subresource(() => Role)
    @ManyToMany(() => Role, (role) => role.users)
    roles: Role[];
}

@EntityRoute({ operations: CRUD_OPERATIONS })
@Entity()
class Article extends AbstractEntity {
    @Groups({ article: ["create", "update", "list", "details"] })
    @Column()
    title: string;

    @Groups({ article: ["create", "list", "details"] })
    @ManyToOne(() => User, (user) => user.articles)
    author: User;

    @Subresource(() => Comment)
    @OneToMany(() => Comment, (comment) => comment.article)
    comments: Comment[];
}

@EntityRoute({ operations: ["update", "delete"] })
@Entity()
class Comment extends AbstractEntity {
    @Groups({ comment: ["create", "list"] })
    @Column()
    message: string;

    @ManyToOne(() => Article, (article) => article.comments)
    article: Article;

    @Groups({ comment: ["list"], article: ["details"] })
    @OneToMany(() => Upvote, (upvote) => upvote.comment)
    upvotes: Upvote[];
}

@EntityRoute({ operations: ["delete"] })
@Entity()
class Upvote extends AbstractEntity {
    @ManyToOne(() => Comment, (comment) => comment.upvotes)
    comment: Comment;

    @Groups({ comment: ["list"], article: ["details"] })
    @ManyToOne(() => Image)
    reaction: Image;
}
