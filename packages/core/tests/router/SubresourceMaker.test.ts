import {
    BridgeRouter,
    EntityRoute,
    EntityRouter,
    EntityRouterFactoryOptions,
    EntityRouterOptions,
    ROUTE_SUBRESOURCES_METAKEY,
    Subresource,
    SubresourceMaker,
    SubresourceMakerOptions,
    SubresourceOptions,
    getEntityRouters,
    getRouteMetadata,
    koaMwAdapter,
    koaRouterFactory,
    printBridgeRoute,
    prop,
    registerKoaRouteFromBridgeRoute,
} from "@entity-routes/core";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, getRepository } from "typeorm";

import { Article, Comment, Manager, Upvote, User } from "./sample/entities";

describe("SubresourceManager", () => {
    const options: EntityRouterFactoryOptions = {
        routerFactoryFn: koaRouterFactory,
        routerRegisterFn: registerKoaRouteFromBridgeRoute,
        middlewareAdapter: koaMwAdapter,
    };
    const defaultSubresourcesOptions: SubresourceMakerOptions = {
        defaultSubresourceMaxDepthLvl: 2,
        shouldAllowCircular: false,
    };

    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    it("makeSubresourcesRoutes - simple", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;

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

        const manager = new SubresourceMaker(repository, routeMeta, koaMwAdapter);

        const articleEntityRouter = new EntityRouter(Article, routeMeta, options);
        const entityRouters = getEntityRouters();
        entityRouters[Article.name] = articleEntityRouter;

        const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);
        manager.makeSubresourcesRoutes(router);

        const paths = router.routes.map(printBridgeRoute);
        const names = router.routes.map(prop("name"));

        expect(paths).toEqualMessy([
            "/user/:UserId(\\d+)/articles : post",
            "/user/:UserId(\\d+)/articles : get",
            "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
        ]);
        expect(names).toEqualMessy(["user_articles_create", "user_articles_list", "user_articles_delete"]);

        return closeTestConnection();
    });

    it("makeSubresourcesRoutes - with custom path/operations", async () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            name: string;

            @Subresource(() => Role, { path: "main_role", operations: ["create", "details", "list"] })
            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([Role, User]);

        const repository = getRepository(User);
        const routeMeta = getRouteMetadata(User);

        const manager = new SubresourceMaker(repository, routeMeta, koaMwAdapter);

        const entityRouters = getEntityRouters();
        const roleEntityRouter = new EntityRouter(Role, routeMeta, options);
        entityRouters[Role.name] = roleEntityRouter;

        const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);
        manager.makeSubresourcesRoutes(router);

        const paths = router.routes.map(printBridgeRoute);
        const names = router.routes.map(prop("name"));

        expect(paths).toEqualMessy(["/user/:UserId(\\d+)/main_role : post", "/user/:UserId(\\d+)/main_role : get"]);
        expect(names).toEqualMessy(["user_role_create", "user_role_details"]);

        return closeTestConnection();
    });

    describe("recursive makeSubresourcesRoutes", () => {
        const entities = [Manager, User, Article, Comment, Upvote];
        const resetMetadata = () => {
            entities.forEach((entity) => Reflect.deleteMetadata(ROUTE_SUBRESOURCES_METAKEY, entity));
        };

        const registerSubresource = (
            fromTarget: Function,
            toTarget: Function,
            prop: string,
            options?: SubresourceOptions
        ) => {
            const noop = new Function();
            noop.constructor = fromTarget;
            Subresource(() => toTarget, options)(noop, prop);
        };
        const registerAllSubresources = () => {
            registerSubresource(Manager, Article, "articles");

            registerSubresource(User, Manager, "manager");
            registerSubresource(User, Article, "articles");
            registerSubresource(User, Comment, "comments");

            registerSubresource(Article, User, "author");
            registerSubresource(Article, Comment, "comments");
            registerSubresource(Article, User, "writers");

            registerSubresource(Upvote, User, "upvoter");
            registerSubresource(Upvote, Comment, "comment");

            registerSubresource(Comment, Article, "article");
            registerSubresource(Comment, User, "writer");
            registerSubresource(Comment, Upvote, "upvotes");
        };

        beforeEach(resetMetadata);

        it("generates all possibles subresources", async () => {
            registerAllSubresources();
            await createTestConnection(entities);

            const entityRouters = getEntityRouters();

            // Registering all EntityRouter
            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), options);
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/manager : post",
                "/user/:UserId(\\d+)/manager : get",
                "/user/:UserId(\\d+)/manager : delete",
                "/user/:UserId(\\d+)/manager/articles : get",
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/articles/comments : get",
                "/user/:UserId(\\d+)/comments : post",
                "/user/:UserId(\\d+)/comments : get",
                "/user/:UserId(\\d+)/comments/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments/upvotes : get",
            ]);

            expect(names).toEqualMessy([
                "user_manager_create",
                "user_manager_details",
                "user_manager_delete",
                "user_manager_articles_list",
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_articles_comments_list",
                "user_comments_create",
                "user_comments_list",
                "user_comments_delete",
                "user_comments_upvotes_list",
            ]);

            return closeTestConnection();
        });

        it("generates nested subsources until max depth is reached - as EntityRouter option", async () => {
            registerAllSubresources();
            await createTestConnection(entities);

            const entityRouters = getEntityRouters();
            const mergedOptions: EntityRouterOptions = { ...options, defaultSubresourcesOptions };

            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), mergedOptions);
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/manager : post",
                "/user/:UserId(\\d+)/manager : get",
                "/user/:UserId(\\d+)/manager : delete",
                "/user/:UserId(\\d+)/manager/articles : get",
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/articles/comments : get",
                "/user/:UserId(\\d+)/comments : post",
                "/user/:UserId(\\d+)/comments : get",
                "/user/:UserId(\\d+)/comments/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments/upvotes : get",
            ]);

            expect(names).toEqualMessy([
                "user_manager_create",
                "user_manager_details",
                "user_manager_delete",
                "user_manager_articles_list",
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_articles_comments_list",
                "user_comments_create",
                "user_comments_list",
                "user_comments_delete",
                "user_comments_upvotes_list",
            ]);

            return closeTestConnection();
        });

        it("generates nested subsources until max depth is reached - as Subresource option", async () => {
            registerSubresource(Manager, Article, "articles", { maxDepth: 1 });

            registerSubresource(User, Manager, "manager", { maxDepth: 3 });
            registerSubresource(User, Article, "articles", { maxDepth: 5 });
            registerSubresource(User, Comment, "comments");

            registerSubresource(Article, User, "author", { maxDepth: 1 });
            registerSubresource(Article, Comment, "comments");

            registerSubresource(Upvote, User, "upvoter", { maxDepth: 1 });
            registerSubresource(Upvote, Comment, "comment");

            registerSubresource(Comment, Article, "article", { maxDepth: 2 });
            registerSubresource(Comment, User, "writer");
            registerSubresource(Comment, Upvote, "upvotes", { maxDepth: 3 });

            await createTestConnection(entities);

            const entityRouters = getEntityRouters();

            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), options);
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/manager : post",
                "/user/:UserId(\\d+)/manager : get",
                "/user/:UserId(\\d+)/manager : delete",
                "/user/:UserId(\\d+)/manager/articles : get",
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/articles/comments : get",
                "/user/:UserId(\\d+)/articles/comments/upvotes : get",
                "/user/:UserId(\\d+)/comments : post",
                "/user/:UserId(\\d+)/comments : get",
                "/user/:UserId(\\d+)/comments/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments/upvotes : get",
            ]);

            expect(names).toEqualMessy([
                "user_manager_create",
                "user_manager_details",
                "user_manager_delete",
                "user_manager_articles_list",
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_articles_comments_list",
                "user_articles_comments_upvotes_list",
                "user_comments_create",
                "user_comments_list",
                "user_comments_delete",
                "user_comments_upvotes_list",
            ]);

            return closeTestConnection();
        });

        it("generates nested subsources for those that allow it (canBeNested)", async () => {
            registerSubresource(Manager, Article, "articles", { canBeNested: false });

            registerSubresource(User, Manager, "manager", { canBeNested: true });
            registerSubresource(User, Article, "articles");
            registerSubresource(User, Comment, "comments", { canBeNested: false });

            registerSubresource(Article, User, "author", { canBeNested: false });
            registerSubresource(Article, Comment, "comments", { canBeNested: false });

            registerSubresource(Upvote, User, "upvoter", { canBeNested: false });
            registerSubresource(Upvote, Comment, "comment", { canBeNested: false });

            registerSubresource(Comment, Article, "article", { canBeNested: false });
            registerSubresource(Comment, User, "writer", { canBeNested: false });
            registerSubresource(Comment, Upvote, "upvotes", { canBeNested: false });

            await createTestConnection(entities);

            const entityRouters = getEntityRouters();

            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), options);
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/manager : post",
                "/user/:UserId(\\d+)/manager : get",
                "/user/:UserId(\\d+)/manager : delete",
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments : post",
                "/user/:UserId(\\d+)/comments : get",
                "/user/:UserId(\\d+)/comments/:id(\\d+) : delete",
            ]);

            expect(names).toEqualMessy([
                "user_manager_create",
                "user_manager_details",
                "user_manager_delete",
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_comments_create",
                "user_comments_list",
                "user_comments_delete",
            ]);

            return closeTestConnection();
        });

        it("generates nested subsources for those that allow it (canHaveNested)", async () => {
            registerSubresource(Manager, Article, "articles", { canHaveNested: false });

            registerSubresource(User, Manager, "manager", { canHaveNested: true });
            registerSubresource(User, Article, "articles", { canHaveNested: false });
            registerSubresource(User, Comment, "comments");

            registerSubresource(Article, User, "author", { canHaveNested: false });
            registerSubresource(Article, Comment, "comments");

            registerSubresource(Upvote, User, "upvoter", { canHaveNested: false });
            registerSubresource(Upvote, Comment, "comment");

            registerSubresource(Comment, Article, "article", { canHaveNested: false });
            registerSubresource(Comment, User, "writer");
            registerSubresource(Comment, Upvote, "upvotes", { canHaveNested: true });

            await createTestConnection(entities);

            const entityRouters = getEntityRouters();

            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), options);
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/manager : post",
                "/user/:UserId(\\d+)/manager : get",
                "/user/:UserId(\\d+)/manager : delete",
                "/user/:UserId(\\d+)/manager/articles : get",
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments : post",
                "/user/:UserId(\\d+)/comments : get",
                "/user/:UserId(\\d+)/comments/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/comments/upvotes : get",
            ]);

            expect(names).toEqualMessy([
                "user_manager_create",
                "user_manager_details",
                "user_manager_delete",
                "user_manager_articles_list",
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_comments_create",
                "user_comments_list",
                "user_comments_delete",
                "user_comments_upvotes_list",
            ]);

            return closeTestConnection();
        });

        it("generates nested subsources with circular if allowed", async () => {
            registerSubresource(User, Article, "articles", { maxDepth: 3 });
            registerSubresource(Article, User, "writers", { maxDepth: 3 });

            await createTestConnection(entities);

            const entityRouters = getEntityRouters();
            const circularOptions = { shouldAllowCircular: true };

            entities.forEach((entity) => {
                entityRouters[entity.name] = new EntityRouter(entity, getRouteMetadata(entity), {
                    ...options,
                    defaultSubresourcesOptions: circularOptions,
                });
            });

            const router = new BridgeRouter(koaRouterFactory, registerKoaRouteFromBridgeRoute);

            const maker = entityRouters[User.name].subresourceMaker;
            maker.makeSubresourcesRoutes(router);

            const paths = router.routes.map(printBridgeRoute);
            const names = router.routes.map(prop("name"));

            expect(paths).toEqualMessy([
                "/user/:UserId(\\d+)/articles : post",
                "/user/:UserId(\\d+)/articles : get",
                "/user/:UserId(\\d+)/articles/:id(\\d+) : delete",
                "/user/:UserId(\\d+)/articles/writers : get",
                "/user/:UserId(\\d+)/articles/writers/articles : get",
            ]);

            expect(names).toEqualMessy([
                "user_articles_create",
                "user_articles_list",
                "user_articles_delete",
                "user_articles_writers_list",
                "user_articles_writers_articles_list",
            ]);

            return closeTestConnection();
        });
    });
});
