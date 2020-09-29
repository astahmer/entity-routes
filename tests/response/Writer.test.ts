import { Column, Entity, getRepository, PrimaryGeneratedColumn } from "typeorm";

import { Groups, makeEntity, Writer } from "@/index";
import { closeTestConnection, createTestConnection, makeReqCtxWithState } from "@@/tests/testConnection";

describe("Writer", () => {
    class AbstractEntity {
        @Groups("all")
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups(["create", "list", "createScoped"])
        @Column()
        name: string;

        @Groups(["create", "update", "details"])
        @Column()
        birthDate: Date;
    }

    beforeAll(() => createTestConnection([User]));
    afterAll(closeTestConnection);

    it("makeResponse", async () => {
        const writer = new Writer(getRepository(User));

        const result = makeEntity(User, { id: 1, name: "Alex", birthDate: new Date() });
        const ctx = makeReqCtxWithState({ operation: "details" });

        const response = await writer.makeResponse(ctx, result);
        const { "@context": responseCtx, ...responseEntity } = response;

        expect(responseCtx).toEqual({ operation: "details", entity: "user" });
        expect(result).toEqual(responseEntity);
    });

    it("fromItem", async () => {
        //
    });

    it("fromItem - allow skipping defaults decorators", async () => {
        //
    });

    it("fromItem - allow passing custom decorators", async () => {
        //
    });

    it("fromItem - allow deep sorting response", async () => {
        //
    });
});
