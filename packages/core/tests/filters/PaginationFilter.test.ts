import {
    AliasHandler,
    OrderBy,
    Pagination,
    PaginationFilter,
    PaginationFilterOptions,
    getPaginationFilterDefaultConfig,
    getRouteFiltersMeta,
} from "@entity-routes/core";
import { closeTestConnection, createTestConnection } from "@entity-routes/test-utils";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, getRepository } from "typeorm";

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
            let aliasHandler = new AliasHandler();
            paginationFilter.apply({ qb, aliasHandler, queryParams: undefined });
            // pagination filter should not have set any orderBy for now
            expect(qb.expressionMap.orderBys).toEqual({});
            expect(qb.expressionMap.take).toEqual(configOptions.defaultRetrievedItemsLimit);

            aliasHandler = new AliasHandler();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { orderBy: ["firstName", "role.identifier", "role.id"], take: "15", skip: "30" };
            paginationFilter.apply({ qb, aliasHandler, queryParams });
            // pagination filter should have set orderBys from queryParams
            // but role.id shouldn't be set since it was not explicitly provided in properties & options.autoApplyOrderBys is not true
            expect(qb.expressionMap.orderBys).toEqual({ "user.firstName": "ASC", "user_role_1.identifier": "ASC" });
            expect(qb.expressionMap.take).toEqual(15);
            expect(qb.expressionMap.skip).toEqual(30);
        });
    });

    it("can auto apply orderBy properties using option", async () => {
        @Pagination(["firstName", ["role.identifier", "desc"]], { autoApplyOrderBys: true })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const filtersMeta = getRouteFiltersMeta(User);
        const repository = getRepository(User);
        const entityMetadata = repository.metadata;
        const paginationFilter = new PaginationFilter({ config: filtersMeta["PaginationFilter"], entityMetadata });

        let qb = repository.createQueryBuilder(entityMetadata.tableName);
        let aliasHandler = new AliasHandler();
        paginationFilter.apply({ qb, aliasHandler, queryParams: undefined });

        // pagination filter should have set default orderBy from decorator properties
        expect(qb.expressionMap.orderBys).toEqual({ "user.firstName": "ASC", "user_role_1.identifier": "ASC" });

        closeTestConnection();
    });
});

describe("OrderBy", () => {
    it("can register filter using @OrderBy decorator", async () => {
        @Entity()
        class User extends AbstractEntity {
            @OrderBy()
            @Column()
            firstName: string;

            @OrderBy("desc", "identifier")
            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const defaultConfig = getPaginationFilterDefaultConfig();

        expect(getRouteFiltersMeta(User)).toEqual({
            PaginationFilter: {
                ...defaultConfig,
                properties: ["firstName:asc", "role.identifier:desc"],
            },
        });

        closeTestConnection();
    });

    it("append .id to relations propPath", async () => {
        @Entity()
        class User extends AbstractEntity {
            @OrderBy("desc")
            @Column()
            firstName: string;

            @OrderBy()
            @ManyToOne(() => Role)
            role: Role;
        }

        await createTestConnection([User, Role]);

        const filtersMeta = getRouteFiltersMeta(User);
        const repository = getRepository(User);
        const entityMetadata = repository.metadata;
        const paginationFilter = new PaginationFilter({ config: filtersMeta["PaginationFilter"], entityMetadata });

        let qb = repository.createQueryBuilder(entityMetadata.tableName);
        let aliasHandler = new AliasHandler();
        paginationFilter.apply({ qb, aliasHandler, queryParams: { orderBy: "role" } });

        // pagination filter should have set default orderBy from decorator properties
        expect(qb.expressionMap.orderBys).toEqual({ "user_role_1.id": "ASC" });

        closeTestConnection();
    });
});
