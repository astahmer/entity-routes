import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, getRepository } from "typeorm";
import { Groups, DependsOn, Cleaner } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Container } from "typedi";

describe("Cleaner", () => {
    class AbstractEntity {
        @Groups(["create", "update"])
        @PrimaryGeneratedColumn()
        id: number;
    }

    @Entity()
    class Role extends AbstractEntity {
        @Groups({ user: ["create"] })
        @Column()
        title: string;

        @Groups({ user: ["create"] })
        @Column()
        startDate: Date;

        @Groups({ user: ["create"] })
        @Column()
        endDate: Date;
    }

    @Entity()
    class User extends AbstractEntity {
        @Groups({ user: "all" })
        @Column()
        name: string;

        @Column()
        @Groups({ user: ["create"] })
        email: string;

        @ManyToOne(() => Role)
        @Groups({ user: ["create", "update"] })
        role: Role;

        @DependsOn(["id", "name"])
        getIdentifier() {
            return `${this.id}_${this.name}`;
        }
    }

    beforeAll(async () => createTestConnection([Role, User]));
    afterAll(closeTestConnection);

    it("cleanItem properly", () => {
        const entityMetadata = getRepository(User).metadata;
        const cleaner = Container.get(Cleaner) as Cleaner<User>;

        const values = new User();
        values.id = 1;
        values.name = "Alex";
        values.email = "email@test.com";

        const role = new Role();
        role.id = 1;
        role.title = "Admin";
        role.startDate = new Date();
        role.endDate = new Date();

        values.role = role;

        // Role.startDate/endDate should have been excluded
        expect(cleaner.cleanItem({ values, operation: "create", rootMetadata: entityMetadata })).toEqual({
            id: 1,
            name: "Alex",
            email: "email@test.com",
            role: { id: 1, title: "Admin" },
        });

        // Anything in role except id should have been excluded along with User.email
        expect(cleaner.cleanItem({ values, operation: "update", rootMetadata: entityMetadata })).toEqual({
            id: 1,
            name: "Alex",
            role: { id: 1 },
        });
    });
});
