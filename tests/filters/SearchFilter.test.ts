import {
    getRouteFiltersMeta,
    AliasManager,
    Search,
    getSearchFilterDefaultConfig,
    SearchFilter,
    AbstractFilterConstructor,
    QueryParams,
    QueryParamValue,
    FilterParam,
    ApplyNestedConditionFiltersArgs,
    COMPARISON_OPERATOR,
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

describe("Search filter", () => {
    describe("with only option (allShallow)", () => {
        @Search({ allShallow: true })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        beforeAll(() => createTestConnection([User, Role]));
        afterAll(closeTestConnection);

        it("can register filter using @Search decorator with options", async () => {
            const defaultConfig = getSearchFilterDefaultConfig();

            expect(getRouteFiltersMeta(User)).toEqual({
                SearchFilter: {
                    ...defaultConfig,
                    options: {
                        ...defaultConfig.options,
                        allShallow: true,
                    },
                    properties: [],
                },
            });
        });

        it("can apply filter on all shallow props (User direct props) only", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const searchFilter = new SearchFilter({ config: filtersMeta["SearchFilter"], entityMetadata });

            let qb = repository.createQueryBuilder(entityMetadata.tableName);
            let aliasManager = new AliasManager();
            searchFilter.apply({ qb, aliasManager, queryParams: undefined });
            // Search filter should not have set any condition yet since no queryParams were used
            expect(qb.expressionMap.wheres).toEqual([]);

            aliasManager = new AliasManager();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { id: "123", firstName: "Alex", role: "789", "role.identifier": "abc456" };
            searchFilter.apply({ qb, aliasManager, queryParams });
            // should have set conditions accordingly to queryParams
            // except "role.identifier" since options only allow shallow props to be filtered
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.id = :id)" },
                { type: "and", condition: "(user.firstName = :firstName)" },
                { type: "and", condition: "(user_role_1.id = :id)" },
            ]);
        });
    });

    describe("on custom properties with custom defaultWhereStrategy", () => {
        @Search(["firstName", ["role.identifier", "CONTAINS"]], { defaultWhereStrategy: "STARTS_WITH" })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        beforeAll(() => createTestConnection([User, Role]));
        afterAll(closeTestConnection);

        it("can register filter using @Search decorator on specific properties only", async () => {
            const defaultConfig = getSearchFilterDefaultConfig();

            expect(getRouteFiltersMeta(User)).toEqual({
                SearchFilter: {
                    ...defaultConfig,
                    options: {
                        ...defaultConfig.options,
                        defaultWhereStrategy: "STARTS_WITH",
                    },
                    properties: ["firstName", ["role.identifier", "CONTAINS"]],
                },
            });
        });

        it("can apply filter on specific properties only", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const searchFilter = new SearchFilter({ config: filtersMeta["SearchFilter"], entityMetadata });

            let qb = repository.createQueryBuilder(entityMetadata.tableName);
            let aliasManager = new AliasManager();
            searchFilter.apply({ qb, aliasManager, queryParams: undefined });
            // Search filter should not have set any condition yet since no queryParams were used
            expect(qb.expressionMap.wheres).toEqual([]);

            aliasManager = new AliasManager();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { id: "123", firstName: "Alex", role: "789", "role.identifier": "abc456" };
            searchFilter.apply({ qb, aliasManager, queryParams });
            // should have set conditions accordingly to queryParams
            // but with only firstName & role.identifier since they alone were explicitly specified on @Search properties
            // firstName strategy is LIKE since it is the defaultWhereStrategy given in options
            // and role.identifier strategy is CONTAINS since it was provided in properties (in FilterProperty tuple)
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.firstName LIKE :firstName)" },
                { type: "and", condition: "(user_role_1.identifier LIKE :identifier)" },
            ]);
            expect(qb.expressionMap.parameters).toEqual({ firstName: "Alex%", identifier: "%abc456%" });
        });
    });

    describe("protected methods", () => {
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;

            @Column()
            isAdmin: boolean;

            @Column()
            email: string;

            @Column()
            birthDate: Date;
        }

        class TestSearchFilter extends SearchFilter {
            getFiltersLists(queryParams: QueryParams) {
                return super.getFiltersLists(queryParams);
            }
            getFilterParam(key: string, rawValue: QueryParamValue): FilterParam {
                return super.getFilterParam(key, rawValue);
            }
            applyNestedConditionsFilters({
                qb,
                whereExp,
                nestedConditionsFilters,
                aliasManager,
            }: ApplyNestedConditionFiltersArgs) {
                return super.applyNestedConditionsFilters({
                    qb,
                    whereExp,
                    nestedConditionsFilters,
                    aliasManager,
                });
            }
        }

        const getTestFilter = (options = {}) => {
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const config: AbstractFilterConstructor["config"] = { options: { all: true, ...options }, properties: [] };
            const searchFilter = new TestSearchFilter({ config, entityMetadata });
            return searchFilter;
        };

        describe("getFilterParam & getFiltersLists", () => {
            let filter: TestSearchFilter;
            beforeAll(async () => {
                await createTestConnection([User, Role]);
                filter = getTestFilter();
            });
            afterAll(closeTestConnection);

            const queryParams = {
                notExistingEntityKey: "abc",
                firstName: "astahmer",
                "id>": "15",
                "or:isAdmin": "true",
                "or(mailCondition):email;endsWith": "@gmail.com",
                "or(mailCondition)or(nestedMailCondition):email;startsWith": ["astahmer", "alex"],
                "or(mailCondition)or(nestedMailCondition):email": "mail@gmail.com",
            };
            const firstNameCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: false,
                nestedCondition: undefined,
                propPath: "firstName",
                strategy: "EXACT",
                not: false,
                value: [queryParams.firstName],
                comparison: undefined,
            };
            const idCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: false,
                nestedCondition: undefined,
                propPath: "id",
                strategy: "GREATER_THAN",
                not: false,
                value: [queryParams["id>"]],
                comparison: ">" as COMPARISON_OPERATOR.GREATER_THAN,
            };
            const isAdminCondition: FilterParam = {
                type: "or",
                isNestedConditionFilter: false,
                nestedCondition: "",
                propPath: "isAdmin",
                strategy: "EXACT",
                not: false,
                value: [queryParams["or:isAdmin"]],
                comparison: undefined,
            };
            const endsWithCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: true,
                nestedCondition: "or(mailCondition)",
                propPath: "email",
                strategy: "ENDS_WITH",
                not: false,
                value: ["@gmail.com"],
                comparison: undefined,
            };
            const startsWithCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: true,
                nestedCondition: "or(mailCondition)or(nestedMailCondition)",
                propPath: "email",
                strategy: "STARTS_WITH",
                not: false,
                value: queryParams["or(mailCondition)or(nestedMailCondition):email;startsWith"],
                comparison: undefined,
            };
            const exactCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: true,
                nestedCondition: "or(mailCondition)or(nestedMailCondition)",
                propPath: "email",
                strategy: "EXACT",
                not: false,
                value: [queryParams["or(mailCondition)or(nestedMailCondition):email"]],
                comparison: undefined,
            };

            const mailCondition = {
                "0": endsWithCondition,
                or: { nestedMailCondition: { "0": startsWithCondition, "1": exactCondition } },
            };

            it("firstNameCondition", () => {
                expect(filter.getFilterParam("firstName", queryParams.firstName)).toEqual(firstNameCondition);
            });

            it("idCondition", () => {
                expect(filter.getFilterParam("id>", queryParams["id>"])).toEqual(idCondition);
            });
            it("isAdminCondition", () => {
                expect(filter.getFilterParam("or:isAdmin", queryParams["or:isAdmin"])).toEqual(isAdminCondition);
            });
            it("endsWithCondition", () => {
                expect(
                    filter.getFilterParam(
                        "or(mailCondition):email;endsWith",
                        queryParams["or(mailCondition):email;endsWith"]
                    )
                ).toEqual(endsWithCondition);
            });
            it("startsWithCondition", () => {
                expect(
                    filter.getFilterParam(
                        "or(mailCondition)or(nestedMailCondition):email;startsWith",
                        queryParams["or(mailCondition)or(nestedMailCondition):email;startsWith"]
                    )
                ).toEqual(startsWithCondition);
            });

            it("exactCondition", () => {
                expect(
                    filter.getFilterParam(
                        "or(mailCondition)or(nestedMailCondition):email",
                        queryParams["or(mailCondition)or(nestedMailCondition):email"]
                    )
                ).toEqual(exactCondition);
            });

            it("getFiltersLists", () => {
                const { filters, nestedConditionsFilters } = filter.getFiltersLists(queryParams);
                expect(filters).toEqual([firstNameCondition, idCondition, isAdminCondition]);
                expect(nestedConditionsFilters).toEqual({ or: { mailCondition } });
            });
        });

        it("complex example", () => {
            jest.spyOn(console, "warn").mockImplementation(() => {});
            const filter = getTestFilter();
            const queryParams = {
                notExistingEntityKey: "abc",
                firstName: "astahmer",
                "id>": "15",
                "or:role.notExistingRoleKey": "123",
                "or:isAdmin": "true",
                "or(first):birthDate>": new Date().toISOString(),
                "or(first):email;endsWith": "@gmail.com",
                "or(first)or(second):role.identifier": ["astahmer", "alex"],
                "or(first)or(second)or:role.id;exists!": "true",
            };
            // TODO Graphli-like sandbox to display queryParams->SQL results ?

            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const qb = repository.createQueryBuilder(entityMetadata.tableName);
            const aliasManager = new AliasManager();

            filter.apply({ qb, aliasManager, queryParams });
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.firstName = :firstName)" },
                { type: "and", condition: "(user.id > :id)" },
                { type: "or", condition: "(user.isAdmin = :isAdmin)" },
                {
                    type: "or",
                    condition:
                        "(((user.birthDate > :birthDate) AND (user.email LIKE :email)) OR ((user_role_1.identifier = :identifier OR user_role_1.identifier = :identifier_1) OR (user_role_1.id IS NULL)))",
                },
            ]);
        });
    });
});
