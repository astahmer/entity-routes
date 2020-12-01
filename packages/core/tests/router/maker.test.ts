import { EntityRoute, getEntityRouters } from "@entity-routes/core";
import { closeTestConnection, createTestConnection, makeTestEntityRouters } from "@entity-routes/test-utils";
import { IsDate, IsEmail, IsString, getMetadataStorage } from "class-validator";
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, getConnection } from "typeorm";

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

    @EntityRoute(
        { path: "/people", operations: ["list"] },
        { defaultMaxDepthOptions: { isMaxDepthEnabledByDefault: false } }
    )
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

            await makeTestEntityRouters({ connection: getConnection(), entities });
            expect(validationMetas.find((meta) => meta.propertyName === "name").always).toEqual(undefined);

            // should have been set to true since no groups were provided
            expect(validationMetas.find((meta) => meta.propertyName === "email").always).toEqual(true);
        });

        it("only make routers for entities decorated with @EntityRoute", async () => {
            await makeTestEntityRouters({ connection: getConnection(), entities });
            const entityRouters = getEntityRouters();
            expect(Object.keys(entityRouters).length).toEqual(3);
        });
    });
});
