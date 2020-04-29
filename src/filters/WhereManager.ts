import { COMPARISON_OPERATOR, WhereOperator, WhereMethod, AbstractFilterConfig } from "@/filters/AbstractFilter";
import { parseStringAsBoolean, camelToSnake } from "@/functions/primitives";
import { FilterParam, SearchFilterOptions } from "@/filters/SearchFilter";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { Brackets, WhereExpression } from "typeorm";
import { Service } from "typedi";

@Service()
export class WhereManager {
    /**
     * Retrieve a property default where strategy from its propName/propPath
     * @example
     * propPath = "name" -> return "STARTS_WITH"
     * propPath = "profilePicture.id" -> return "EXACT"
     */
    public getPropertyDefaultWhereStrategy(config: AbstractFilterConfig<SearchFilterOptions>, propPath: string) {
        // If all entity props are enabled as filters, return default where strategy
        if (config.options.all) {
            return config.options.defaultWhereStrategy || "EXACT";
        }

        const propFilter = config.properties.find((propFilter) =>
            typeof propFilter === "string" ? propFilter === propPath : propFilter[0] === propPath
        );

        return typeof propFilter === "string"
            ? config.options.defaultWhereStrategy || "EXACT"
            : this.formatWhereStrategy(propFilter[1]);
    }

    /**
     * Returns where strategy formatted as a valid keyof StrategyType
     * @example
     * strategyRaw = "startsWith" -> return "STARTS_WITH"
     */
    public formatWhereStrategy(strategyRaw: string) {
        return camelToSnake(strategyRaw).toUpperCase() as StrategyType;
    }

    public getWhereOperatorByStrategy(strategy: StrategyType, not: boolean, propCount: number): WhereOperator {
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
                if (propCount === 0) {
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

    public getWhereParamByStrategy(strategy: StrategyType, propName: string, value: string | boolean | Date) {
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
        strategy: StrategyType,
        column: ColumnMetadata,
        value: string,
        not: boolean,
        propCount: number
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

                case "BETWEEN":
                    if (Array.isArray(value)) {
                        value[0] = value[0] + " " + (!not ? DAY.END : DAY.START);
                        value[1] = value[1] + " " + (!not ? DAY.START : DAY.END);
                    }
                    return value;

                case "BETWEEN_STRICT":
                    if (propCount === 0) {
                        return value + " " + (!not ? DAY.END : DAY.START);
                    } else {
                        return value + " " + (!not ? DAY.START : DAY.END);
                    }

                default:
                    break;
            }
        } else if (typeof column.type === "function" && column.type.name === "Boolean") {
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
        rawValue: string;
        propCount?: number;
        not: boolean;
        column: ColumnMetadata;
    }) {
        const paramName = propCount ? propName + "_" + propCount : propName;
        const value = this.getWhereParamValueByStrategy(strategy, column, rawValue, not, propCount);

        if ("EXISTS" === strategy) {
            // use not (if given) to reverse query param value
            not = not ? !parseStringAsBoolean(rawValue) : parseStringAsBoolean(rawValue);
        }

        if ("BETWEEN" !== strategy) {
            const whereOperator = this.getWhereOperatorByStrategy(strategy, not, propCount);
            const whereParamSlot = this.getWhereParamSlotByStrategy(strategy, paramName);
            const whereParam = this.getWhereParamByStrategy(strategy, paramName, value);

            const whereCondition = `${entityAlias}.${propName} ${whereOperator} ${whereParamSlot}`;
            return { whereOperator, whereCondition, whereParam };
        } else {
            // Quite specific case for BETWEEN strategy
            const whereOperator = (not ? "NOT " : "") + "BETWEEN";
            const whereParamSlot = `:${paramName + "_1"} AND :${paramName + "_2"}`;
            const whereParam = { [paramName + "_1"]: rawValue[0], [paramName + "_2"]: rawValue[1] };

            const whereCondition = `${entityAlias}.${propName} ${whereOperator} ${whereParamSlot}`;
            return { whereOperator, whereCondition, whereParam };
        }
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
                entityAlias: entityAlias,
                propName,
                rawValue: filter.value as string,
                column,
            });
            whereExp[mainMethod](whereCondition, whereParam);
        }
    }

    /** Returns strategy given from queryParamKey or default one for this propPath if none given/not valid */
    public getWhereStrategyIdentifier(
        config: AbstractFilterConfig<SearchFilterOptions>,
        strategyRaw: string,
        propPath: string,
        comparison: COMPARISON_OPERATOR
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
