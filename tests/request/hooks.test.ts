import { PrimaryGeneratedColumn, Entity, Column, getRepository } from "typeorm";
import { createTestConnection, closeTestConnection, makeTestCtx } from "@@/tests/testConnection";
import {
    MiddlewareMaker,
    Groups,
    RequestState,
    ContextWithState,
    ObjectLiteral,
    EntityRouteState,
    EntityRoute,
    Persistor,
    HookFnBeforeClean,
    HookFnAfterClean,
    HookFnBeforeValidate,
    HookFnAfterValidate,
    HookFnBeforePersist,
    HookFnAfterPersist,
    Reader,
    HookFnBeforeRead,
    AliasHandler,
    HookFnAfterRead,
    HookFnOnRespond,
} from "@/index";
import { setupKoaApp } from "@@/tests/router/bridge/koaSetup";
import { IsEmail } from "class-validator";
import { Container } from "typedi";

/** Possible hooks are [before/after][Handle/?:(Clean/Validate/Persist)/?:(Read)/Respond] */
describe("hooks", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @EntityRoute({ operations: ["list"] })
    @Entity()
    class User extends AbstractEntity {
        @Groups("basic")
        @Column()
        name: string;

        @Groups("basic")
        @Column({ nullable: true })
        identifier?: string;

        @Groups({ user: "all" })
        @IsEmail()
        @Column()
        email: string;
    }

    const entities = [User];
    const persistor = Container.get(Persistor);
    const reader = Container.get(Reader);

    beforeEach(() => createTestConnection(entities));
    afterEach(closeTestConnection);

    it("beforeHandle - allows to interact with request context before response middleware", async () => {
        const noop = () => {};

        let state: EntityRouteState;
        const beforeHandle = jest.fn((ctx: ContextWithState) => {
            ctx.state.newKey = "afterHandle";
            state = ctx.state;
        });

        const manager = new MiddlewareMaker(getRepository(User), { hooks: { beforeHandle } });
        const mw = manager.makeRequestContextMiddleware("list");

        await mw(
            makeTestCtx<RequestState>({ query: { id: "123" } }),
            noop
        );

        expect(beforeHandle).toHaveBeenCalled();
        expect(state.requestContext.queryParams).toEqual({ id: "123" });
        expect(state.newKey).toEqual("afterHandle");
    });

    it("afterHandle - allows to do something on request end", async () => {
        let responseBody: ObjectLiteral;

        const afterHandle = (ctx: ContextWithState) => (responseBody = ctx.responseBody);
        const { server, client } = await setupKoaApp(entities, { hooks: { afterHandle } });

        try {
            const result = await client.get("/user");
            expect(responseBody).toEqual(result.data);
        } catch (error) {
            throw error;
        } finally {
            server.close();
        }
    });

    it("beforeClean - allows to edit values sent before getting cleaned", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@mail.com";

        let email: string;
        const beforeClean: HookFnBeforeClean = ({ options }) => (email = options.values.email);

        try {
            await persistor.saveItem({ ctx: { operation: "create", values }, rootMetadata, hooks: { beforeClean } });
            expect(email).toEqual(values.email);
        } catch (error) {
            throw error;
        }
    });

    it("afterClean - allows to edit cleanedItem", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@mail.com";

        const afterClean: HookFnAfterClean = ({ result }) => (result.identifier = `${result.name} - ${result.email}`);

        try {
            const result = await persistor.saveItem<User>({
                ctx: { operation: "create", values },
                rootMetadata,
                hooks: { afterClean },
            });
            expect(result).toEqual({
                id: 1,
                name: values.name,
                email: values.email,
                identifier: `${values.name} - ${values.email}`,
            });
        } catch (error) {
            throw error;
        }
    });

    it("beforeValidate - allows to edit values sent before getting validated", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@";

        const beforeValidate: HookFnBeforeValidate = ({ item }) => (item.email += "defaultMail.fr");

        try {
            const result = await persistor.saveItem<User>({
                ctx: { operation: "create", values },
                rootMetadata,
                hooks: { beforeValidate },
            });
            expect(result).toEqual({
                id: 1,
                name: values.name,
                email: values.email + "defaultMail.fr",
                identifier: null,
            });
        } catch (error) {
            throw error;
        }
    });

    it("afterValidate - allows to edit errors", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@";

        // Supress errors after validation for x reason
        let errorsCount;
        const afterValidate: HookFnAfterValidate = ({ ref }) => {
            errorsCount = Object.keys(ref.errors).length;
            ref.errors = {};
        };

        try {
            const result = await persistor.saveItem<User>({
                ctx: { operation: "create", values },
                rootMetadata,
                hooks: { afterValidate },
            });
            expect(result).toEqual({
                id: 1,
                name: values.name,
                email: values.email,
                identifier: null,
            });
            expect(errorsCount).toEqual(1);
        } catch (error) {
            throw error;
        }
    });

    it("beforePersist - last chance to edit item to be saved", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@mail.com";

        const beforePersist: HookFnBeforePersist = ({ item }) => (item.name = "Max");

        try {
            const result = await persistor.saveItem<User>({
                ctx: { operation: "create", values },
                rootMetadata,
                hooks: { beforePersist },
            });
            expect(result).toEqual({
                id: 1,
                name: "Max",
                email: values.email,
                identifier: null,
            });
        } catch (error) {
            throw error;
        }
    });

    it("afterPersist - allows to do something after an entity was persisted", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;

        const values = new User();
        values.name = "Alex";
        values.email = "alex@mail.com";

        // Saving a clone of entity after it was saved
        let mailSentTo: string;
        const sendMail = (user: User) => (mailSentTo = user.id + " - " + user.name);
        const afterPersist: HookFnAfterPersist = ({ result }) => sendMail(result as User);

        try {
            const result = (await persistor.saveItem<User>({
                ctx: { operation: "create", values },
                rootMetadata,
                hooks: { afterPersist },
            })) as User;
            expect(mailSentTo).toEqual(result.id + " - " + values.name);
        } catch (error) {
            throw error;
        }
    });

    it("beforeRead - allows to do something before an entity/collection is read from db", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;
        const qb = repository.createQueryBuilder(rootMetadata.tableName);
        const aliasHandler = new AliasHandler();

        let state = false;
        const beforeRead: HookFnBeforeRead = (_args) => (state = true);

        try {
            const result = (await persistor.saveItem<User>({
                ctx: { operation: "create", values: { name: "abc", email: "alex@mail.com" } },
                rootMetadata,
            })) as User;

            await reader.getItem({
                entityMetadata: rootMetadata,
                qb,
                aliasHandler,
                entityId: result.id,
                hooks: { beforeRead },
            });
            expect(state).toEqual(true);
        } catch (error) {
            throw error;
        }
    });

    it("afterRead - allows to edit result read from the db", async () => {
        const repository = getRepository(User);
        const rootMetadata = repository.metadata;
        const qb = repository.createQueryBuilder(rootMetadata.tableName);
        const aliasHandler = new AliasHandler();

        const edited = "edited";
        const afterRead: HookFnAfterRead = ({ ref }) => (ref.result = edited as any);

        try {
            const result = (await persistor.saveItem<User>({
                ctx: { operation: "create", values: { name: "abc", email: "alex@mail.com" } },
                rootMetadata,
            })) as User;

            const item = await reader.getItem({
                entityMetadata: rootMetadata,
                qb,
                aliasHandler,
                entityId: result.id,
                hooks: { afterRead },
            });
            expect(item).toEqual(edited);
        } catch (error) {
            throw error;
        }
    });

    it("beforeRespond - allows editing response before sending it", async () => {
        const edited = "edited";
        const beforeRespond: HookFnOnRespond = (args) => (args.response = "edited" as any);
        const { server, client } = await setupKoaApp(entities, { hooks: { beforeRespond } });

        try {
            const result = await client.get("/user");
            expect(result.data).toEqual(edited);
        } catch (error) {
            throw error;
        } finally {
            server.close();
        }
    });

    it("afterRespond - allows doing something after response has been sent", async () => {
        let id = null;
        const afterRespond: HookFnOnRespond = ({ ctx }) => (id = ctx.state.requestId);

        const { server, client } = await setupKoaApp(entities, { hooks: { afterRespond } });

        try {
            await client.get("/user");
            expect(id).toBeString();
        } catch (error) {
            throw error;
        } finally {
            server.close();
        }
    });
});
