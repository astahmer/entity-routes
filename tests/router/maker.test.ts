import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, OneToOne, getConnection } from "typeorm";
import { IsString, IsEmail, IsDate, getMetadataStorage } from "class-validator";
import * as Router from "koa-router";

import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import {
    EntityRoute,
    makeEntityRouters,
    registerKoaRouteFromBridgeRoute,
    getEntityRouters,
    koaMwAdapter,
    koaRouterFactory,
} from "@/index";

describe("maker", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Thing extends AbstractEntity {
        @Column()
        title: string;
    }

    @EntityRoute()
    @Entity()
    class Picture extends AbstractEntity {
        @Column()
        filePath: string;
    }

    @EntityRoute({ operations: ["create", "details"] })
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

    @EntityRoute({ path: "/people", operations: ["list"] }, { isMaxDepthEnabledByDefault: false })
    @Entity()
    class User extends AbstractEntity {
        @IsString({ groups: ["user_create"] })
        @Column()
        name: string;

        @IsEmail()
        @Column()
        email: string;

        @ManyToOne(() => Role)
        role: Role;

        @OneToOne(() => Picture)
        profilePicture: Picture;

        @ManyToOne(() => Thing)
        thing: Thing[];
    }

    describe("makeEntityRouters", () => {
        const entities = [Role, Picture, Thing, User];

        beforeAll(() => createTestConnection(entities));
        afterAll(closeTestConnection);

        it("setValidationMetaAlwaysIfNoGroups", async () => {
            const validationMetaStorage = getMetadataStorage();
            const validationMetas = validationMetaStorage.getTargetValidationMetadatas(User, null);

            expect(validationMetas.find((meta) => meta.propertyName === "name").always).toEqual(undefined);
            expect(validationMetas.find((meta) => meta.propertyName === "email").always).toEqual(false);

            await makeEntityRouters({
                connection: getConnection(),
                entities,
                options: {
                    routerFactoryFn: koaRouterFactory,
                    routerRegisterFn: registerKoaRouteFromBridgeRoute,
                    middlewareAdapter: koaMwAdapter,
                },
            });
            expect(validationMetas.find((meta) => meta.propertyName === "name").always).toEqual(undefined);

            // should have been set to true since no groups were provided
            expect(validationMetas.find((meta) => meta.propertyName === "email").always).toEqual(true);
        });

        it("only make routers for entities decorated with @EntityRoute", async () => {
            await makeEntityRouters({
                connection: getConnection(),
                entities,
                options: {
                    routerFactoryFn: koaRouterFactory,
                    routerRegisterFn: registerKoaRouteFromBridgeRoute,
                    middlewareAdapter: koaMwAdapter,
                },
            });
            const entityRouters = getEntityRouters();
            expect(Object.keys(entityRouters).length).toEqual(3);
        });
    });
});
