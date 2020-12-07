import { Service } from "typedi";
import { Brackets, WhereExpression } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { camelToSnake, isType, parseStringAsBoolean } from "../functions";
import {
    AbstractFilterConfig,
    COMPARISON_OPERATOR,
    FilterParam,
    QueryParamValue,
    SearchFilterOptions,
    WhereMethod,
    WhereOperator,
} from ".";

@Service()
export class WhereManager {
    /**
     * Retrieve a property default where strategy from its propName/propPath
     * @example
     * propPath = "name" -> return "STARTS_WITH"
     * propPath = "profilePicture.id" -> return "EXACT"
     */
    public getPropertyDefaultWhereStrategy(
        config: AbstractFilterConfig<SearchFilterOptions, StrategyType>,
        propPath: string
    ) {
        const fallbackStrategy = "EXACT";
        const isNestedProp = propPath.includes(".");
        const shouldReturnDefault =
            config.options.all || (isNestedProp ? config.options.allNested : config.options.allShallow);
        // If all entity props are enabled as filters, return default where strategy
        if (shouldReturnDefault) {
            return config.options.defaultWhereStrategy || fallbackStrategy;
        }

        const propFilter = config.properties.find((propFilter) =>
            typeof propFilter === "string" ? propFilter === propPath : propFilter[0] === propPath
        );

        if (!propFilter) return fallbackStrategy;

        return typeof propFilter === "string"
            ? config.options.defaultWhereStrategy || fallbackStrategy
            : this.formatWhereStrategy(propFilter[1]);
    }

    /**
     * Returns where strategy formated as a valid keyof StrategyType
     * @example
     * strategyRaw = "startsWith" -> return "STARTS_WITH"
     * strategyRaw = "STARTS_WITH" -> return "STARTS_WITH" // untouched
     */
    public formatWhereStrategy(strategyRaw: string) {
        const strategy =
            strategyRaw[0] === strategyRaw[0].toUpperCase() ? strategyRaw : camelToSnake(strategyRaw).toUpperCase();
        return strategy as StrategyType;
    }

    /**
     *
     * @param strategy any StrategyType except BETWEEN which is a special case
     * @param not if true then the condition is reversed
     * @param propCount specific to BETWEEN_STRICT strategy, if 1 returns the opposite sign
     */
    public getWhereOperatorByStrategy(
        strategy: Exclude<StrategyType, "BETWEEN">,
        not?: boolean,
        propCount?: number
    ): WhereOperator {
        let operator;
        switch (strategy) {
            default:
            case "EXACT":
                operator = (not ? "!" : "") + "=";
                break;

            case "IN":
                operator = (not ? "NOT " : "") + "IN";
                break;

            case "IS":
                operator = "IS" + (not ? " NOT" : "");
                break;

            case "EXISTS":
                operator = "IS" + (not ? " NOT" : "") + " NULL";
                break;

            case "CONTAINS":
            case "STARTS_WITH":
            case "ENDS_WITH":
                operator = (not ? "NOT " : "") + "LIKE";
                break;

            case "BETWEEN_STRICT":
                if (!propCount) {
                    operator = !not ? ">" : "<=";
                } else {
                    operator = !not ? "<" : ">=";
                }
                break;

            case "LESS_THAN":
                operator = !not ? "<" : ">=";
                break;

            case "LESS_THAN_OR_EQUAL":
                operator = !not ? "<=" : ">";
                break;

            case "GREATER_THAN":
                operator = !not ? ">" : "<=";
                break;

            case "GREATER_THAN_OR_EQUAL":
                operator = !not ? ">=" : "<";
                break;
        }

        return operator as WhereOperator;
    }

    public getWhereParamByStrategy(strategy: StrategyType, propName: string, value: QueryParamValue | boolean | Date) {
        switch (strategy) {
            default:
                return { [propName]: value };

            case "EXISTS":
                return {};

            case "CONTAINS":
                return { [propName]: "%" + value + "%" };

            case "STARTS_WITH":
                return { [propName]: value + "%" };

            case "ENDS_WITH":
                return { [propName]: "%" + value };
        }
    }

    public getWhereParamSlotByStrategy(strategy: StrategyType, paramName: string) {
        if (strategy === "IN") {
            return `(:...${paramName})`;
        } else if (strategy === "EXISTS") {
            return "";
        } else {
            return `:${paramName}`;
        }
    }

    public getWhereParamValueByStrategy(
        strategy: Exclude<StrategyType, "BETWEEN">,
        column: ColumnMetadata,
        value: QueryParamValue,
        not?: boolean,
        propCount?: number
    ) {
        // If property is a datetime and the searched value only contains Date (=without time)
        if (column.type === "datetime" && value.indexOf(":") === -1) {
            // add start/end of day with time
            switch (strategy) {
                case "LESS_THAN_OR_EQUAL":
                case "GREATER_THAN":
                    return value + " " + DAY.END;

                case "GREATER_THAN_OR_EQUAL":
                case "LESS_THAN":
                    return value + " " + DAY.START;

                case "BETWEEN_STRICT":
                    if (!propCount) {
                        return value + " " + (!not ? DAY.END : DAY.START);
                    } else {
                        return value + " " + (!not ? DAY.START : DAY.END);
                    }

                default:
                    break;
            }
        } else if (isType<string>(value, isColumnBoolean(column))) {
            // Returns string converted to boolean (inversed by not operator)
            return not ? !parseStringAsBoolean(value) : parseStringAsBoolean(value);
        }

        return value;
    }

    /** Get the associated strategy of a comparison operator */
    public getWhereStrategyByComparison(comparison: COMPARISON_OPERATOR) {
        switch (comparison) {
            case COMPARISON_OPERATOR.BETWEEN:
                return "BETWEEN";

            case COMPARISON_OPERATOR.BETWEEN_STRICT:
                return "BETWEEN_STRICT";

            case COMPARISON_OPERATOR.LESS_THAN:
                return "LESS_THAN";

            case COMPARISON_OPERATOR.LESS_THAN_OR_EQUAL:
                return "LESS_THAN_OR_EQUAL";

            case COMPARISON_OPERATOR.GREATER_THAN:
                return "GREATER_THAN";

            case COMPARISON_OPERATOR.GREATER_THAN_OR_EQUAL:
                return "GREATER_THAN_OR_EQUAL";
        }
    }

    /** Returns where arguments for a filter param: operator, condition and parameter */
    public getWhereArgs({
        strategy,
        entityAlias,
        propName,
        rawValue,
        propCount,
        not,
        column,
    }: {
        strategy: StrategyType;
        entityAlias: string;
        propName: string;
        rawValue: QueryParamValue;
        propCount?: number;
        not: boolean;
        column: ColumnMetadata;
    }) {
        let paramName = `${propName}_${not ? "NOT_" : ""}${strategy}`;
        if (propCount) paramName += "_" + propCount;

        if ("BETWEEN" === strategy) {
            // Quite specific case for BETWEEN strategy
            const whereOperator = (not ? "NOT " : "") + "BETWEEN";
            const whereParamSlot = `:${paramName + "_1"} AND :${paramName + "_2"}`;
            const whereParam = { [paramName + "_1"]: rawValue[0], [paramName + "_2"]: rawValue[1] };

            const whereCondition = `${entityAlias}.${propName} ${whereOperator} ${whereParamSlot}`;
            return { whereOperator, whereCondition, whereParam };
        }

        const value = this.getWhereParamValueByStrategy(strategy, column, rawValue, not, propCount);

        if (isType<string>(rawValue, "EXISTS" === strategy)) {
            // use not (if given) to reverse query param value
            not = not ? !parseStringAsBoolean(rawValue) : parseStringAsBoolean(rawValue);
        }

        const whereOperator = this.getWhereOperatorByStrategy(strategy, not, propCount);
        const whereParamSlot = this.getWhereParamSlotByStrategy(strategy, paramName);
        const whereParam = this.getWhereParamByStrategy(strategy, paramName, value);

        const whereCondition = `${entityAlias}.${propName} ${whereOperator}${
            whereParamSlot ? " " + whereParamSlot : whereParamSlot
        }`;
        return { whereOperator, whereCondition, whereParam };
    }

    /** Add where condition by a given strategy type  */
    public addWhereByStrategy({
        whereExp,
        entityAlias,
        filter,
        propName,
        column,
    }: {
        whereExp: WhereExpression;
        entityAlias: string;
        filter: FilterParam;
        propName: string;
        column: ColumnMetadata;
    }) {
        const mainMethod = (filter.type.toLowerCase() + "Where") as WhereMethod;

        // Both IN and BETWEEN strategies use an array as value in a single condition
        if (Array.isArray(filter.value) && "IN" !== filter.strategy && "BETWEEN" !== filter.strategy) {
            whereExp[mainMethod](
                new Brackets((qb) => {
                    for (let i = 0; i < filter.value.length; i++) {
                        const { whereCondition, whereParam } = this.getWhereArgs({
                            strategy: filter.strategy,
                            not: filter.not,
                            entityAlias: entityAlias,
                            propName,
                            rawValue: filter.value[i],
                            propCount: i,
                            column,
                        });

                        let nestedMethod;
                        if (!filter.not) {
                            nestedMethod = "BETWEEN_STRICT" !== filter.strategy ? "orWhere" : "andWhere";
                        } else {
                            nestedMethod = "BETWEEN_STRICT" !== filter.strategy ? "andWhere" : "orWhere";
                        }

                        qb[nestedMethod as WhereMethod](whereCondition, whereParam);
                    }
                })
            );
        } else {
            const { whereCondition, whereParam } = this.getWhereArgs({
                strategy: filter.strategy,
                not: filter.not,
                entityAlias,
                propName,
                rawValue: filter.value,
                column,
            });
            whereExp[mainMethod](whereCondition, whereParam);
        }
    }

    /** Returns strategy given from queryParamKey or default one for this propPath if none given/not valid */
    public getWhereStrategyIdentifier(
        config: AbstractFilterConfig<SearchFilterOptions, StrategyType>,
        strategyRaw: string,
        propPath: string,
        comparison?: COMPARISON_OPERATOR
    ): StrategyType {
        let strategyIdentifier: StrategyType;
        if (strategyRaw) {
            if (isStrategyType(strategyRaw)) {
                // Valid identifier was directly used in queryParamKey
                return strategyRaw;
            } else {
                // Format strategy to a proper strategy identifier
                strategyIdentifier = this.formatWhereStrategy(strategyRaw);

                // Check that strategy identifier is a valid one
                if (isStrategyType(strategyIdentifier)) {
                    return strategyIdentifier;
                }
            }
        } else if (comparison) {
            // If no strategy was defined but there is a comparison operator, use it as shortcut for a strategy
            return this.getWhereStrategyByComparison(comparison);
        }

        // Either no strategy/comparison was given in queryParamKey or the strategy is not a valid one
        return this.getPropertyDefaultWhereStrategy(config, propPath);
    }
}

export type StrategyType =
    | "EXACT"
    | "IN"
    | "IS"
    | "EXISTS"
    | "CONTAINS"
    | "STARTS_WITH"
    | "ENDS_WITH"
    | "BETWEEN"
    | "BETWEEN_STRICT"
    | "LESS_THAN"
    | "LESS_THAN_OR_EQUAL"
    | "GREATER_THAN"
    | "GREATER_THAN_OR_EQUAL";
// TODO count strategy for array property ?

export function isStrategyType(value: string): value is StrategyType {
    const keys = [
        "EXACT",
        "IN",
        "IS",
        "EXISTS",
        "CONTAINS",
        "STARTS_WITH",
        "ENDS_WITH",
        "BETWEEN",
        "BETWEEN_STRICT",
        "LESS_THAN",
        "LESS_THAN_OR_EQUAL",
        "GREATER_THAN",
        "GREATER_THAN_OR_EQUAL",
    ];

    return keys.includes(value);
}

export enum DAY {
    START = "00:00:00",
    END = "23:59:59",
}

export const isColumnBoolean = (column: ColumnMetadata) =>
    typeof column.type === "function" ? column.type.name === "Boolean" : ["bool", "boolean"].includes(column.type);
