import {
    getRouteFiltersMeta,
    Pagination,
    getPaginationFilterDefaultConfig,
    PaginationFilter,
    PaginationFilterOptions,
    AliasManager,
} from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, getRepository } from "typeorm";

class AbstractEntity {
    @PrimaryGeneratedColumn()
    id: number;
}

@Entity()
class Role extends AbstractEntity {
    @Column()
    identifier: string;
}
describe("Pagination filter", () => {
    it("can register filter using @Pagination decorator without options", async () => {
        @Pagination()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const defaultConfig = getPaginationFilterDefaultConfig();

        expect(getRouteFiltersMeta(User)).toEqual({
            PaginationFilter: {
                ...defaultConfig,
                properties: [],
            },
        });

        closeTestConnection();
    });

    it("can register filter using @Pagination decorator with options", async () => {
        @Pagination({ defaultOrderDirection: "desc", defaultRetrievedItemsLimit: 25 })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const defaultConfig = getPaginationFilterDefaultConfig();

        expect(getRouteFiltersMeta(User)).toEqual({
            PaginationFilter: {
                ...defaultConfig,
                options: {
                    ...defaultConfig.options,
                    defaultOrderDirection: "desc",
                    defaultRetrievedItemsLimit: 25,
                },
                properties: [],
            },
        });

        closeTestConnection();
    });

    describe("apply", () => {
        @Pagination(["firstName", ["role.identifier", "desc"]], { defaultRetrievedItemsLimit: 50 })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        beforeAll(() => createTestConnection([User, Role]));
        afterAll(closeTestConnection);

        it("can register filter using @Pagination decorator on specific properties only", async () => {
            const defaultConfig = getPaginationFilterDefaultConfig();

            expect(getRouteFiltersMeta(User)).toEqual({
                PaginationFilter: {
                    ...defaultConfig,
                    options: {
                        ...defaultConfig.options,
                        defaultRetrievedItemsLimit: 50,
                    },
                    properties: ["firstName", ["role.identifier", "desc"]],
                },
            });
        });

        it("can be applied with options & queryParam value", async () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const paginationFilter = new PaginationFilter({ config: filtersMeta["PaginationFilter"], entityMetadata });
            const configOptions = filtersMeta["PaginationFilter"].options as PaginationFilterOptions;

            let qb = repository.createQueryBuilder(entityMetadata.tableName);
            let aliasManager = new AliasManager();
            paginationFilter.apply({ qb, aliasManager, queryParams: undefined });
            // pagination filter should not have set any orderBy for now
            expect(qb.expressionMap.orderBys).toEqual({});
            expect(qb.expressionMap.take).toEqual(configOptions.defaultRetrievedItemsLimit);

            aliasManager = new AliasManager();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { orderBy: ["firstName", "role.identifier", "role.id"], take: "15", skip: "30" };
            paginationFilter.apply({ qb, aliasManager, queryParams });
            // pagination filter should have set orderBys from queryParams
            // but role.id shouldn't be set since it was not explicitly provided in properties & options.autoApplyOrderBys is not true
            expect(qb.expressionMap.orderBys).toEqual({ "user.firstName": "ASC", "user_role_1.identifier": "ASC" });
            expect(qb.expressionMap.take).toEqual(15);
            expect(qb.expressionMap.skip).toEqual(30);
        });
    });

    // TODO OrderBy
    // TODO describe protected methods
});
