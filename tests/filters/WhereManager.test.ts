import {
    Search,
    WhereManager,
    getSearchFilterDefaultConfig,
    AbstractFilterConfig,
    SearchFilterOptions,
    StrategyType,
    DAY,
    COMPARISON_OPERATOR,
} from "@/index";
import { createTestConnection, closeTestConnection } from "@@/testConnection";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, getRepository, EntityMetadata, Repository } from "typeorm";
import { Container } from "typedi/Container";

class AbstractEntity {
    @PrimaryGeneratedColumn()
    id: number;
}

@Entity()
class Role extends AbstractEntity {
    @Column()
    identifier: string;
}

describe("WhereManager", () => {
    @Search({ all: true })
    @Entity()
    class User extends AbstractEntity {
        @Column()
        firstName: string;

        @ManyToOne(() => Role)
        role: Role;

        @Column()
        birthDate: Date;

        @Column({ type: "datetime" })
        createdAt: Date;

        @Column({ type: "boolean" })
        isAdmin: boolean;
    }

    const manager = Container.get(WhereManager);

    describe("getPropertyDefaultWhereStrategy", () => {
        const defaultConfig = getSearchFilterDefaultConfig();

        it("should return defaultWhereStrategy when none found on prop", () => {
            const config: AbstractFilterConfig<SearchFilterOptions, StrategyType> = {
                ...defaultConfig,
                options: {
                    ...defaultConfig.options,
                    defaultWhereStrategy: "STARTS_WITH",
                },
                properties: ["firstName", ["role.identifier", "CONTAINS"]],
            };
            expect(manager.getPropertyDefaultWhereStrategy(config, "firstName")).toEqual("STARTS_WITH");
        });

        it("should return prop strategy when defined on prop", () => {
            const config: AbstractFilterConfig<SearchFilterOptions, StrategyType> = {
                ...defaultConfig,
                options: {
                    ...defaultConfig.options,
                    defaultWhereStrategy: "STARTS_WITH",
                },
                properties: ["firstName", ["role.identifier", "CONTAINS"]],
            };
            expect(manager.getPropertyDefaultWhereStrategy(config, "role.identifier")).toEqual("CONTAINS");
        });

        it("should fallback to 'EXACT' strategy if none found on prop & defined as default", () => {
            const config: AbstractFilterConfig<SearchFilterOptions, StrategyType> = {
                class: defaultConfig.class,
                options: {},
                properties: ["firstName", ["role.identifier", "CONTAINS"]],
            };
            expect(manager.getPropertyDefaultWhereStrategy(config, "firstName")).toEqual("EXACT");
        });

        it("should fallback to 'EXACT' strategy if none defined as default & all props are enabled as filter", () => {
            const config: AbstractFilterConfig<SearchFilterOptions, StrategyType> = {
                class: defaultConfig.class,
                options: { all: true },
                properties: ["firstName", ["role.identifier", "CONTAINS"]],
            };
            expect(manager.getPropertyDefaultWhereStrategy(config, "firstName")).toEqual("EXACT");
        });
    });

    describe("formatWhereStrategy", () => {
        // (abCd => AB_CD)
        it("should format stategy from camelCase to uppercase snake case", () => {
            expect(manager.formatWhereStrategy("startsWith")).toEqual("STARTS_WITH");
            expect(manager.formatWhereStrategy("contains")).toEqual("CONTAINS");
            expect(manager.formatWhereStrategy("greaterThan")).toEqual("GREATER_THAN");
        });
        it("should ignore strategies starting with an uppercase letter", () =>
            expect(manager.formatWhereStrategy("STARTS_WITH")).toEqual("STARTS_WITH"));
    });

    describe("getWhereStrategyIdentifier", () => {
        const defaultConfig = getSearchFilterDefaultConfig();
        const config: AbstractFilterConfig<SearchFilterOptions, StrategyType> = {
            ...defaultConfig,
            options: {
                ...defaultConfig.options,
                defaultWhereStrategy: "STARTS_WITH",
            },
            properties: ["firstName", ["role.identifier", "CONTAINS"]],
        };

        it("should fallback to config default strategy when not provided in queryParams", () => {
            expect(manager.getWhereStrategyIdentifier(config, undefined, "firstName")).toEqual("STARTS_WITH");
        });
        it("should use property default strategy when not provided in queryParams and defined in config", () => {
            expect(manager.getWhereStrategyIdentifier(config, undefined, "role.identifier")).toEqual("CONTAINS");
        });
        it("should use strategy from queryParam when provided in queryParams", () => {
            expect(manager.getWhereStrategyIdentifier(config, "endsWith", "firstName")).toEqual("ENDS_WITH");
        });
        it("should deduct & use strategy from comparison in queryParam when provided", () => {
            expect(
                manager.getWhereStrategyIdentifier(config, undefined, "id", COMPARISON_OPERATOR.GREATER_THAN)
            ).toEqual("GREATER_THAN");
        });
    });

    describe("getWhereOperatorByStrategy", () => {
        it("exact", () => {
            expect(manager.getWhereOperatorByStrategy("EXACT")).toEqual("=");
            expect(manager.getWhereOperatorByStrategy("EXACT", true)).toEqual("!=");
        });

        it("in", () => {
            expect(manager.getWhereOperatorByStrategy("IN")).toEqual("IN");
            expect(manager.getWhereOperatorByStrategy("IN", true)).toEqual("NOT IN");
        });

        it("is", () => {
            expect(manager.getWhereOperatorByStrategy("IS")).toEqual("IS");
            expect(manager.getWhereOperatorByStrategy("IS", true)).toEqual("IS NOT");
        });

        it("exists", () => {
            expect(manager.getWhereOperatorByStrategy("EXISTS")).toEqual("IS NULL");
            expect(manager.getWhereOperatorByStrategy("EXISTS", true)).toEqual("IS NOT NULL");
        });

        it("contains", () => {
            expect(manager.getWhereOperatorByStrategy("CONTAINS")).toEqual("LIKE");
            expect(manager.getWhereOperatorByStrategy("CONTAINS", true)).toEqual("NOT LIKE");
        });

        it("startsWith", () => {
            expect(manager.getWhereOperatorByStrategy("STARTS_WITH")).toEqual("LIKE");
            expect(manager.getWhereOperatorByStrategy("STARTS_WITH", true)).toEqual("NOT LIKE");
        });

        it("endsWith", () => {
            expect(manager.getWhereOperatorByStrategy("ENDS_WITH")).toEqual("LIKE");
            expect(manager.getWhereOperatorByStrategy("ENDS_WITH", true)).toEqual("NOT LIKE");
        });

        it("betweenStrict", () => {
            expect(manager.getWhereOperatorByStrategy("BETWEEN_STRICT")).toEqual(">");
            expect(manager.getWhereOperatorByStrategy("BETWEEN_STRICT", false, 1)).toEqual("<");

            expect(manager.getWhereOperatorByStrategy("BETWEEN_STRICT", true)).toEqual("<=");
            expect(manager.getWhereOperatorByStrategy("BETWEEN_STRICT", true, 1)).toEqual(">=");
        });

        it("lessThan", () => {
            expect(manager.getWhereOperatorByStrategy("LESS_THAN")).toEqual("<");
            expect(manager.getWhereOperatorByStrategy("LESS_THAN", true)).toEqual(">=");
        });

        it("lessThanOrEqual", () => {
            expect(manager.getWhereOperatorByStrategy("LESS_THAN_OR_EQUAL")).toEqual("<=");
            expect(manager.getWhereOperatorByStrategy("LESS_THAN_OR_EQUAL", true)).toEqual(">");
        });

        it("greaterThan", () => {
            expect(manager.getWhereOperatorByStrategy("GREATER_THAN")).toEqual(">");
            expect(manager.getWhereOperatorByStrategy("GREATER_THAN", true)).toEqual("<=");
        });

        it("greaterThanOrEqual", () => {
            expect(manager.getWhereOperatorByStrategy("GREATER_THAN_OR_EQUAL")).toEqual(">=");
            expect(manager.getWhereOperatorByStrategy("GREATER_THAN_OR_EQUAL", true)).toEqual("<");
        });
    });

    describe("getWhereParamByStrategy", () => {
        const [prop, value] = ["firstName", "abc"];

        // Default case
        it("between - default", () =>
            expect(manager.getWhereParamByStrategy("BETWEEN", prop, value)).toEqual({ [prop]: value }));

        // Specific cases
        it("exists - specific", () => expect(manager.getWhereParamByStrategy("EXISTS", prop, value)).toEqual({}));
        it("contains - specific", () =>
            expect(manager.getWhereParamByStrategy("CONTAINS", prop, value)).toEqual({
                [prop]: "%" + value + "%",
            }));
        it("startsWith - specific", () =>
            expect(manager.getWhereParamByStrategy("STARTS_WITH", prop, value)).toEqual({ [prop]: value + "%" }));
        it("endsWith - specific", () =>
            expect(manager.getWhereParamByStrategy("ENDS_WITH", prop, value)).toEqual({ [prop]: "%" + value }));
    });

    describe("getWhereParamSlotByStrategy", () => {
        const paramName = "firstName";
        // Default case
        it("exact - default", () =>
            expect(manager.getWhereParamSlotByStrategy("EXACT", paramName)).toEqual(`:${paramName}`));
        // Specific cases
        it("in - specific", () =>
            expect(manager.getWhereParamSlotByStrategy("IN", paramName)).toEqual(`(:...${paramName})`));
        it("exists - specific", () => expect(manager.getWhereParamSlotByStrategy("EXISTS", paramName)).toEqual(""));
    });

    describe("getWhereStrategyByComparison", () => {
        it("between", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.BETWEEN)).toEqual("BETWEEN"));
        it("betweenStrict", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.BETWEEN_STRICT)).toEqual("BETWEEN_STRICT"));

        it("greaterThan", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.GREATER_THAN)).toEqual("GREATER_THAN"));

        it("greaterThanOrEqual", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.GREATER_THAN_OR_EQUAL)).toEqual(
                "GREATER_THAN_OR_EQUAL"
            ));

        it("lessThan", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.LESS_THAN)).toEqual("LESS_THAN"));

        it("lessThanOrEqual", () =>
            expect(manager.getWhereStrategyByComparison(COMPARISON_OPERATOR.LESS_THAN_OR_EQUAL)).toEqual(
                "LESS_THAN_OR_EQUAL"
            ));
    });

    describe("getWhereParamValueByStrategy", () => {
        let metadata: EntityMetadata;
        beforeAll(async () => {
            await createTestConnection([User, Role]);
            metadata = getRepository(User).metadata;
        });
        afterAll(closeTestConnection);

        const getVal = manager.getWhereParamValueByStrategy;

        it("should be ignored since column metadata is of type date and not datetime", () => {
            const birthDateColumn = metadata.findColumnWithPropertyName("birthDate");
            const birthDate = "1996-17-02";
            expect(getVal("GREATER_THAN", birthDateColumn, birthDate)).toEqual(birthDate);
        });

        it("should be ignored since on date since datetime is already provided in value", () => {
            const createdAtColumn = metadata.findColumnWithPropertyName("createdAt");
            const createdAtWithTime = "2020-05-13 13:12";
            expect(getVal("GREATER_THAN", createdAtColumn, createdAtWithTime)).toEqual(createdAtWithTime);
        });

        describe("on date as string value", () => {
            const createdAt = "2020-05-13";
            const createdAtMaxDate = "2020-05-20";

            it("should append DAY.START/END to date value without time", () => {
                const createdAtColumn = metadata.findColumnWithPropertyName("createdAt");
                expect(getVal("GREATER_THAN", createdAtColumn, createdAt)).toEqual(`${createdAt} ${DAY.END}`);
                expect(getVal("LESS_THAN", createdAtColumn, createdAt)).toEqual(`${createdAt} ${DAY.START}`);
            });

            it("should append DAY.START/END to date value without time depending on propCount for betweenStrict", () => {
                const createdAtColumn = metadata.findColumnWithPropertyName("createdAt");
                expect(getVal("BETWEEN_STRICT", createdAtColumn, createdAt, false, 0)).toEqual(
                    `${createdAt} ${DAY.END}`
                );
                expect(getVal("BETWEEN_STRICT", createdAtColumn, createdAtMaxDate, false, 1)).toEqual(
                    `${createdAtMaxDate} ${DAY.START}`
                );
            });

            it('should reverse DAY.START/END since "not" param is true', () => {
                const createdAtColumn = getRepository(User).metadata.findColumnWithPropertyName("createdAt");
                expect(getVal("BETWEEN_STRICT", createdAtColumn, createdAt, true, 0)).toEqual(
                    `${createdAt} ${DAY.START}`
                );
                expect(getVal("BETWEEN_STRICT", createdAtColumn, createdAtMaxDate, true, 1)).toEqual(
                    `${createdAtMaxDate} ${DAY.END}`
                );
            });
        });

        describe("on boolean as string", () => {
            it("should be parsed as boolean", () => {
                const isAdminColumn = getRepository(User).metadata.findColumnWithPropertyName("isAdmin");
                expect(getVal("EXACT", isAdminColumn, "true")).toEqual(true);
                expect(getVal("EXACT", isAdminColumn, "false")).toEqual(false);
                expect(getVal("EXACT", isAdminColumn, "0")).toEqual(false);
                expect(getVal("EXACT", isAdminColumn, "1")).toEqual(true);
            });

            it('should reverse value since "not" param is true', () => {
                const isAdminColumn = getRepository(User).metadata.findColumnWithPropertyName("isAdmin");
                expect(getVal("EXACT", isAdminColumn, "true", true)).toEqual(false);
                expect(getVal("EXACT", isAdminColumn, "false", true)).toEqual(true);
            });
        });
    });

    describe("getWhereArgs", () => {
        let metadata: EntityMetadata;
        let entityAlias: string;
        beforeAll(async () => {
            await createTestConnection([User, Role]);
            metadata = getRepository(User).metadata;
            entityAlias = metadata.tableName;
        });
        afterAll(closeTestConnection);

        it("exact", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "EXACT",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: undefined,
                })
            ).toEqual({ whereOperator: "=", whereCondition: "user.id = :id_EXACT", whereParam: { id_EXACT: "123" } });
        });

        it("NOT exact", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "EXACT",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                })
            ).toEqual({
                whereOperator: "!=",
                whereCondition: "user.id != :id_NOT_EXACT",
                whereParam: { id_NOT_EXACT: "123" },
            });
        });

        it("startsWith", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "STARTS_WITH",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: undefined,
                })
            ).toEqual({
                whereOperator: "LIKE",
                whereCondition: "user.id LIKE :id_STARTS_WITH",
                whereParam: { id_STARTS_WITH: "123%" },
            });
        });

        it("NOT startsWith", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "STARTS_WITH",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                })
            ).toEqual({
                whereOperator: "NOT LIKE",
                whereCondition: "user.id NOT LIKE :id_NOT_STARTS_WITH",
                whereParam: { id_NOT_STARTS_WITH: "123%" },
            });
        });

        it("between", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN",
                    entityAlias,
                    propName: "id",
                    rawValue: ["123", "456"],
                    column: metadata.findColumnWithPropertyName("id"),
                    not: false,
                })
            ).toEqual({
                whereOperator: "BETWEEN",
                whereCondition: "user.id BETWEEN :id_BETWEEN_1 AND :id_BETWEEN_2",
                whereParam: { id_BETWEEN_1: "123", id_BETWEEN_2: "456" },
            });
        });
        it("NOT between", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN",
                    entityAlias,
                    propName: "id",
                    rawValue: ["123", "456"],
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                })
            ).toEqual({
                whereOperator: "NOT BETWEEN",
                whereCondition: "user.id NOT BETWEEN :id_NOT_BETWEEN_1 AND :id_NOT_BETWEEN_2",
                whereParam: { id_NOT_BETWEEN_1: "123", id_NOT_BETWEEN_2: "456" },
            });
        });

        it("between strict", () => {
            // 1st iteration
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN_STRICT",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: false,
                    propCount: 0,
                })
            ).toEqual({
                whereOperator: ">",
                whereCondition: "user.id > :id_BETWEEN_STRICT",
                whereParam: { id_BETWEEN_STRICT: "123" },
            });

            // 2nd iteration
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN_STRICT",
                    entityAlias,
                    propName: "id",
                    rawValue: "456",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: false,
                    propCount: 1,
                })
            ).toEqual({
                whereOperator: "<",
                whereCondition: "user.id < :id_BETWEEN_STRICT_1",
                whereParam: { id_BETWEEN_STRICT_1: "456" },
            });
        });

        it("NOT between strict", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN_STRICT",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                    propCount: 0,
                })
            ).toEqual({
                whereOperator: "<=",
                whereCondition: "user.id <= :id_NOT_BETWEEN_STRICT",
                whereParam: { id_NOT_BETWEEN_STRICT: "123" },
            });
            expect(
                manager.getWhereArgs({
                    strategy: "BETWEEN_STRICT",
                    entityAlias,
                    propName: "id",
                    rawValue: "456",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                    propCount: 1,
                })
            ).toEqual({
                whereOperator: ">=",
                whereCondition: "user.id >= :id_NOT_BETWEEN_STRICT_1",
                whereParam: { id_NOT_BETWEEN_STRICT_1: "456" },
            });
        });

        it("exists", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "EXISTS",
                    entityAlias,
                    propName: "id",
                    rawValue: "true",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: false,
                })
            ).toEqual({
                whereOperator: "IS NOT NULL",
                whereCondition: "user.id IS NOT NULL",
                whereParam: {},
            });
        });

        it("NOT exists", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "EXISTS",
                    entityAlias,
                    propName: "id",
                    rawValue: "true",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                })
            ).toEqual({
                whereOperator: "IS NULL",
                whereCondition: "user.id IS NULL",
                whereParam: {},
            });
        });

        it("greaterThan", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "GREATER_THAN",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: undefined,
                })
            ).toEqual({
                whereOperator: ">",
                whereCondition: "user.id > :id_GREATER_THAN",
                whereParam: { id_GREATER_THAN: "123" },
            });
        });

        it("NOT greaterThan", () => {
            expect(
                manager.getWhereArgs({
                    strategy: "GREATER_THAN",
                    entityAlias,
                    propName: "id",
                    rawValue: "123",
                    column: metadata.findColumnWithPropertyName("id"),
                    not: true,
                })
            ).toEqual({
                whereOperator: "<=",
                whereCondition: "user.id <= :id_NOT_GREATER_THAN",
                whereParam: { id_NOT_GREATER_THAN: "123" },
            });
        });
    });

    describe("addWhereByStrategy", () => {
        let metadata: EntityMetadata;
        let repository: Repository<User>;
        let entityAlias: string;
        beforeAll(async () => {
            await createTestConnection([User, Role]);
            repository = getRepository(User);
            metadata = repository.metadata;
            entityAlias = metadata.tableName;
        });
        afterAll(closeTestConnection);

        // Default cases
        it("exact - single value - default", () => {
            const whereExp = repository.createQueryBuilder();
            manager.addWhereByStrategy({
                whereExp,
                column: metadata.findColumnWithPropertyName("id"),
                entityAlias,
                propName: "id",
                filter: {
                    strategy: "EXACT",
                    isNestedConditionFilter: false,
                    propPath: "id",
                    type: "and",
                    value: ["123"],
                    not: false,
                    comparison: undefined,
                },
            });
            expect(whereExp.expressionMap.wheres).toEqual([{ type: "and", condition: "(user.id = :id_EXACT)" }]);
        });

        it("exact - array value - default", () => {
            const whereExp = repository.createQueryBuilder();
            manager.addWhereByStrategy({
                whereExp,
                column: metadata.findColumnWithPropertyName("id"),
                entityAlias,
                propName: "id",
                filter: {
                    strategy: "EXACT",
                    isNestedConditionFilter: false,
                    propPath: "id",
                    type: "and",
                    value: ["321", "654"],
                    not: false,
                    comparison: undefined,
                },
            });
            expect(whereExp.expressionMap.wheres).toEqual([
                { type: "and", condition: "(user.id = :id_EXACT OR user.id = :id_EXACT_1)" },
            ]);
        });

        // Specific cases
        it("between - specific", () => {
            const whereExp = repository.createQueryBuilder();
            manager.addWhereByStrategy({
                whereExp,
                column: metadata.findColumnWithPropertyName("id"),
                entityAlias,
                propName: "id",
                filter: {
                    strategy: "BETWEEN",
                    isNestedConditionFilter: false,
                    propPath: "id",
                    type: "and",
                    value: ["123", "456"],
                    not: false,
                    comparison: undefined,
                },
            });
            expect(whereExp.expressionMap.wheres).toEqual([
                { type: "and", condition: "user.id BETWEEN :id_BETWEEN_1 AND :id_BETWEEN_2" },
            ]);
        });

        it("in - specific", () => {
            const whereExp = repository.createQueryBuilder();
            manager.addWhereByStrategy({
                whereExp,
                column: metadata.findColumnWithPropertyName("id"),
                entityAlias,
                propName: "id",
                filter: {
                    strategy: "IN",
                    isNestedConditionFilter: false,
                    propPath: "id",
                    type: "and",
                    value: ["123", "456"],
                    not: false,
                    comparison: undefined,
                },
            });
            expect(whereExp.expressionMap.wheres).toEqual([{ type: "and", condition: "user.id IN (:...id_IN)" }]);
        });
    });
});
