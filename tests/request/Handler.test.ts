import Container from "typedi";
import { Column, DeleteDateColumn, Entity, getRepository, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { IsString, IsDate } from "class-validator";

import { EntityRouteOptions, Groups, Handler, Search } from "@/index";
import { createTestConnection, closeTestConnection, makeReqCtxWithState } from "@@/tests/testConnection";

describe("Handler", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;

        @DeleteDateColumn()
        deletedAt: Date;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ role: "all", user: ["create", "details"] })
        @Column()
        identifier: string;

        @Groups({ role: "all", user: ["create", "details"] })
        @Column()
        name: string;
    }

    @Search({ all: true })
    @Entity()
    class User extends AbstractEntity {
        @IsString()
        @Groups(["create", "list", "createScoped"])
        @Column()
        name: string;

        @IsDate()
        @Groups(["create", "update", "details"])
        @Column()
        birthDate: Date;

        @Groups("all")
        @ManyToOne(() => Role, { cascade: true })
        role: Role;
    }

    beforeEach(() => createTestConnection([Role, User]));
    afterEach(closeTestConnection);

    afterAll(() => {
        // since entities differ between tests suites, metadata cached on MappingManager must be cleared
        Container.reset();
        return closeTestConnection();
    });

    // TODO Doc response handling
    it("can override route options on specific operation with scoped options", async () => {
        const routeOptions: EntityRouteOptions = { defaultCreateUpdateOptions: { shouldAutoReload: true } };
        const repository = getRepository(User);

        const options = {
            ...routeOptions,
            scopedOptions: (operation: string) =>
                operation === "create" && {
                    defaultCreateUpdateOptions: { responseOperation: "createScoped" },
                },
        };
        const handler = new Handler(repository, options);

        const createCtx = makeReqCtxWithState({ operation: "create", values: { name: "Alex", birthDate: new Date() } });
        const createResult = (await handler.getResult(createCtx as any)) as User;

        const updateCtx = makeReqCtxWithState({
            operation: "update",
            entityId: createResult.id,
            values: { name: "Alex222" },
        });
        const updateResult = (await handler.getResult(updateCtx as any)) as User;

        const detailsCtx = makeReqCtxWithState({ operation: "details", entityId: createResult.id });
        const detailsResult = await handler.getResult(detailsCtx as any);

        // The birthDate is exposed on user.details route scope, while the name is NOT
        expect(updateResult.birthDate).toBeDefined();
        expect(updateResult.name).toBeUndefined();
        expect(updateResult).toEqualMessy(detailsResult);
        // But birthDate is undefined / the name IS exposed on the user.createScoped route scope
        // since the responseOperation was customized on the "create" operation using scopedOptions
        expect(createResult.name).toBeDefined();
        expect(createResult.birthDate).toBeUndefined();
    });
});
