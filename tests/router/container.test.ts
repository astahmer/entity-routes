import { PrimaryGeneratedColumn, Entity, Column, ManyToOne } from "typeorm";
import { IsString, IsEmail, IsDate } from "class-validator";
import * as Router from "koa-router";

import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import {
    EntityRoute,
    getEntityRouters,
    makeEntityRouters,
    registerKoaRouteFromBridgeRoute,
    koaMwAdapter,
    koaRouterFactory,
} from "@/index";

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
        const connection = await createTestConnection(entities);

        await makeEntityRouters({
            connection,
            entities,
            options: {
                routerFactoryFn: koaRouterFactory,
                routerRegisterFn: registerKoaRouteFromBridgeRoute,
                middlewareAdapter: koaMwAdapter,
            },
        });

        const entityRouters = getEntityRouters();
        expect(Object.keys(entityRouters)).toEqual(["Role", "User"]);

        return closeTestConnection();
    });
});
