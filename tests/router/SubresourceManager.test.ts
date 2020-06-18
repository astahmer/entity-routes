import {
    Groups,
    Subresource,
    EntityRoute,
    SubresourceManager,
    getRouteMetadata,
    BridgeRouter,
    registerKoaRouteFromBridgeRoute,
    getEntityRouters,
    EntityRouter,
    koaMwAdapter,
    prop,
    flatMap,
} from "@/index";
import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, OneToMany, getRepository } from "typeorm";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import * as Router from "koa-router";

describe("SubresourceManager", () => {
    class AbstractEntity {
        @Groups(["list", "details"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    it("makeSubresourcesRoutes", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;

            @Column()
            startDate: Date;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;

            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;

            @Subresource(() => Article)
            @OneToMany(() => Article, (article) => article.author)
            articles: Article[];
        }

        @EntityRoute()
        @Entity()
        class Article extends AbstractEntity {
            @Column()
            title: string;

            @ManyToOne(() => User, (user) => user.articles)
            author: User;
        }

        await createTestConnection([Role, User, Article]);

        const repository = getRepository(User);
        const routeMeta = getRouteMetadata(User);

        const manager = new SubresourceManager(repository, routeMeta);
        const options = {
            routerFactoryClass: Router,
            routerRegisterFn: registerKoaRouteFromBridgeRoute,
            middlewareAdapter: koaMwAdapter,
        };
        const articleEntityRouter = new EntityRouter(Article, routeMeta, options);
        const entityRouters = getEntityRouters();
        entityRouters[Article.name] = articleEntityRouter;

        const router = new BridgeRouter(Router, registerKoaRouteFromBridgeRoute);
        manager.makeSubresourcesRoutes(router);
        expect(router.routes.map(prop("path"))).toEqualMessy([
            "/user/:UserId(\\d+)/articles",
            "/user/:UserId(\\d+)/articles",
            "/user/:UserId(\\d+)/articles/:id(\\d+)",
            "/user/:UserId(\\d+)/articles/:id(\\d+)",
        ]);
        expect(flatMap(router.routes.map(prop("methods")))).toEqualMessy(["post", "get", "get", "delete"]);

        return closeTestConnection();
    });

    it("makeSubresourcesRoutes - with custom path/operations", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;

            @Column()
            startDate: Date;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;

            @Column()
            email: string;

            @Subresource(() => Role, { path: "main_role", operations: ["create", "details", "list"] })
            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([Role, User]);

        const repository = getRepository(User);
        const routeMeta = getRouteMetadata(User);

        const manager = new SubresourceManager(repository, routeMeta);
        const options = {
            routerFactoryClass: Router,
            routerRegisterFn: registerKoaRouteFromBridgeRoute,
            middlewareAdapter: koaMwAdapter,
        };
        const roleEntityRouter = new EntityRouter(Role, routeMeta, options);
        const entityRouters = getEntityRouters();
        entityRouters[Role.name] = roleEntityRouter;

        const router = new BridgeRouter(Router, registerKoaRouteFromBridgeRoute);
        manager.makeSubresourcesRoutes(router);

        expect(router.routes.map(prop("path"))).toEqual([
            "/user/:UserId(\\d+)/main_role",
            "/user/:UserId(\\d+)/main_role",
        ]);
        expect(flatMap(router.routes.map(prop("methods")))).toEqualMessy(["post", "get"]);

        return closeTestConnection();
    });

    it("makeSubresourcesRoutes - handles default maxDepth", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;

            @Column()
            startDate: Date;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;

            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;

            @Subresource(() => Article)
            @OneToMany(() => Article, (article) => article.author)
            articles: Article[];

            @Subresource(() => Comment)
            @OneToMany(() => Comment, (comment) => comment.writer)
            comments: Comment[];
        }

        @EntityRoute()
        @Entity()
        class Article extends AbstractEntity {
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
            @Column()
            message: string;

            @Subresource(() => Article)
            @ManyToOne(() => Article, (article) => article.comments)
            article: Article;

            @Subresource(() => User)
            @ManyToOne(() => User, (user) => user.comments)
            writer: User;
        }

        await createTestConnection([Role, User, Article, Comment]);

        const userRouteMeta = getRouteMetadata(User);
        const articleRouteMeta = getRouteMetadata(Article);
        const commentRouteMeta = getRouteMetadata(Comment);

        const userRepo = getRepository(User);
        const userManager = new SubresourceManager(userRepo, userRouteMeta);

        const options = {
            routerFactoryClass: Router,
            routerRegisterFn: registerKoaRouteFromBridgeRoute,
            middlewareAdapter: koaMwAdapter,
        };
        const articleEntityRouter = new EntityRouter(Article, articleRouteMeta, options);
        const commentEntityRouter = new EntityRouter(Comment, commentRouteMeta, options);

        const entityRouters = getEntityRouters();
        entityRouters[Article.name] = articleEntityRouter;
        entityRouters[Comment.name] = commentEntityRouter;

        const router = new BridgeRouter(Router, registerKoaRouteFromBridgeRoute);
        userManager.makeSubresourcesRoutes(router);

        const paths = router.routes.map(prop("path"));
        expect(paths).toEqualMessy([
            "/user/:UserId(\\d+)/articles",
            "/user/:UserId(\\d+)/articles",
            "/user/:UserId(\\d+)/articles/:id(\\d+)",
            "/user/:UserId(\\d+)/articles/:id(\\d+)",
            "/user/:UserId(\\d+)/articles/:ArticleId(\\d+)/comments",
            "/user/:UserId(\\d+)/articles/:ArticleId(\\d+)/comments",
            "/user/:UserId(\\d+)/articles/:ArticleId(\\d+)/comments/:id(\\d+)",
            "/user/:UserId(\\d+)/articles/:ArticleId(\\d+)/comments/:id(\\d+)",
            "/user/:UserId(\\d+)/comments",
            "/user/:UserId(\\d+)/comments",
            "/user/:UserId(\\d+)/comments/:id(\\d+)",
            "/user/:UserId(\\d+)/comments/:id(\\d+)",
            "/user/:UserId(\\d+)/comments/:CommentId(\\d+)/article",
            "/user/:UserId(\\d+)/comments/:CommentId(\\d+)/article",
            "/user/:UserId(\\d+)/comments/:CommentId(\\d+)/article",
        ]);

        return closeTestConnection();
    });

    // TODO it("makeSubresourcesRoutes - handles custom maxDepths", async () => {
});
