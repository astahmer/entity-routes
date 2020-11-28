import {
    AbstractFilterConstructor,
    AliasHandler,
    ApplyNestedConditionFiltersArgs,
    COMPARISON_OPERATOR,
    FilterParam,
    QueryParamValue,
    QueryParams,
    Search,
    SearchFilter,
    formatIriToId,
    getRouteFiltersMeta,
    getSearchFilterDefaultConfig,
} from "@entity-routes/core";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, getRepository } from "typeorm";

import { closeTestConnection, createTestConnection } from "@/testConnection";

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

        it("can apply filter on all shallow props (User direct props) only", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const searchFilter = new SearchFilter({ config: filtersMeta["SearchFilter"], entityMetadata });

            let qb = repository.createQueryBuilder(entityMetadata.tableName);
            let aliasHandler = new AliasHandler();
            searchFilter.apply({ qb, aliasHandler, queryParams: undefined });
            // Search filter should not have set any condition yet since no queryParams were used
            expect(qb.expressionMap.wheres).toEqual([]);

            aliasHandler = new AliasHandler();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { id: "123", firstName: "Alex", role: "789", "role.identifier": "abc456" };
            searchFilter.apply({ qb, aliasHandler, queryParams });
            // should have set conditions accordingly to queryParams
            // except "role.identifier" since options only allow shallow props to be filtered
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.id = :id_EXACT)" },
                { type: "and", condition: "(user.firstName = :firstName_EXACT)" },
                { type: "and", condition: "(user_role_1.id = :id_EXACT)" },
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
            let aliasHandler = new AliasHandler();
            searchFilter.apply({ qb, aliasHandler, queryParams: undefined });
            // Search filter should not have set any condition yet since no queryParams were used
            expect(qb.expressionMap.wheres).toEqual([]);

            aliasHandler = new AliasHandler();
            qb = repository.createQueryBuilder(entityMetadata.tableName);
            const queryParams = { id: "123", firstName: "Alex", role: "789", "role.identifier": "abc456" };
            searchFilter.apply({ qb, aliasHandler, queryParams });
            // should have set conditions accordingly to queryParams
            // but with only firstName & role.identifier since they alone were explicitly specified on @Search properties
            // firstName strategy is LIKE since it is the defaultWhereStrategy given in options
            // and role.identifier strategy is CONTAINS since it was provided in properties (in FilterProperty tuple)
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.firstName LIKE :firstName_STARTS_WITH)" },
                { type: "and", condition: "(user_role_1.identifier LIKE :identifier_CONTAINS)" },
            ]);
            expect(qb.expressionMap.parameters).toEqual({
                firstName_STARTS_WITH: "Alex%",
                identifier_CONTAINS: "%abc456%",
            });
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
                aliasHandler,
            }: ApplyNestedConditionFiltersArgs) {
                return super.applyNestedConditionsFilters({
                    qb,
                    whereExp,
                    nestedConditionsFilters,
                    aliasHandler,
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
                role: ["/api/role/123", "/api/role/456"],
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
            const roleCondition: FilterParam = {
                type: "and",
                isNestedConditionFilter: false,
                nestedCondition: undefined,
                propPath: "role",
                strategy: "EXACT",
                not: false,
                value: queryParams.role.map((iri) => formatIriToId(iri)),
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

            it("should return undefined on unrecognized queryParam", () => {
                expect(filter.getFilterParam("ab:123", null)).toEqual(undefined);
            });

            it("firstNameCondition", () => {
                expect(filter.getFilterParam("firstName", queryParams.firstName)).toEqual(firstNameCondition);
            });

            it("roleCondition", () => {
                expect(filter.getFilterParam("role", queryParams.role)).toEqual(roleCondition);
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
                expect(filters).toEqual([firstNameCondition, roleCondition, idCondition, isAdminCondition]);
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
                "or(first)(third):id": "1",
                "or(first)(third):role.id<>": ["5", "10"],
            };
            // TODO Graphli-like sandbox to display queryParams->SQL results ?

            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const qb = repository.createQueryBuilder(entityMetadata.tableName);
            const aliasHandler = new AliasHandler();

            filter.apply({ qb, aliasHandler, queryParams });
            expect(qb.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.firstName = :firstName_EXACT)" },
                { type: "and", condition: "(user.id > :id_GREATER_THAN)" },
                { type: "or", condition: "(user.isAdmin = :isAdmin_EXACT)" },
                {
                    type: "or",
                    condition: `
                        (
                            (
                                (user.birthDate > :birthDate_GREATER_THAN) AND (user.email LIKE :email_ENDS_WITH)
                            ) AND (
                                (user.id = :id_EXACT) AND user_role_1.id BETWEEN :id_BETWEEN_1 AND :id_BETWEEN_2
                            ) OR (
                                (user_role_1.identifier = :identifier_EXACT OR user_role_1.identifier = :identifier_EXACT_1)
                                OR (user_role_1.id IS NULL)
                            )
                        )`
                        // Kind of annoying formating to get back to TypeORM result
                        // But at least it is "readable" above
                        .trimLeft()
                        .replace(/\s\s+/g, " ")
                        .replace(/\( /g, "(")
                        .replace(/\) /g, ")")
                        .replace(/\)AND/g, ") AND")
                        .replace(/\)OR/g, ") OR")
                        .replace(/ \)/g, ")"),
                },
            ]);
        });
    });
});
