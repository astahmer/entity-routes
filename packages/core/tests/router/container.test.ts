import { IsDate, IsEmail, IsString } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { EntityRoute, getEntityRouters } from "@entity-routes/core";
import { closeTestConnection, createTestConnection, makeTestEntityRouters } from "@entity-routes/test-utils";

describe("container", () => {
    it("can be retrieved", () => {
        const entityRouters = getEntityRouters();
        expect(entityRouters).toEqual({});
    });

    it("has registered routes", async () => {
        class AbstractEntity {
            @PrimaryGeneratedColumn()
            id: number;
        }

        @EntityRoute()
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            title: string;

            @IsDate()
            @Column()
            startDate: Date;

            @Column()
            endDate: Date;
        }

        @EntityRoute()
        @Entity()
        class User extends AbstractEntity {
            @IsString()
            @Column()
            name: string;

            @IsEmail()
            @Column()
            email: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        const entities = [Role, User];
        await createTestConnection(entities);

        await makeTestEntityRouters({ entities });

        const entityRouters = getEntityRouters();
        expect(Object.keys(entityRouters)).toEqual(["Role", "User"]);

        return closeTestConnection();
    });
});
