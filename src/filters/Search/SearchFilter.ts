import { path, prop, sortBy } from "ramda";
import { Brackets, WhereExpression } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    COMPARISON_OPERATOR,
    FilterDefaultConfig,
    DefaultFilterOptions,
    QueryParams,
    QueryParamValue,
    WhereMethod,
    WhereOperator,
    WhereType,
} from "../AbstractFilter";
import { camelToSnake, parseStringAsBoolean } from "@/functions/primitives";
import { isDefined } from "@/functions/asserts";
import { setNestedKey, sortObjectByKeys } from "@/functions/object";
import { formatIriToId, isIriValidForProperty } from "@/functions/entity";

export type SearchFilterOptions = DefaultFilterOptions & { defaultWhereStrategy?: STRATEGY_TYPES };

export enum STRATEGY_TYPES {
    EXACT = "EXACT",
    IN = "IN",
    IS = "IS",
    EXISTS = "EXISTS",
    CONTAINS = "CONTAINS",
    STARTS_WITH = "STARTS_WITH",
    ENDS_WITH = "ENDS_WITH",
    BETWEEN = "BETWEEN",
    BETWEEN_STRICT = "BETWEEN_STRICT",
    LESS_THAN = "LESS_THAN",
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
    GREATER_THAN = "GREATER_THAN",
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
    // TODO count strategy for array property ?
}

export const getSearchFilterDefaultConfig = (
    options: SearchFilterOptions
): FilterDefaultConfig<SearchFilterOptions> => ({
    class: SearchFilter,
    options: {
        all: false,
        defaultWhereStrategy: SearchFilter.STRATEGY_TYPES.EXACT,
        ...options,
    },
});

const complexFilterRegex = /(?:((?:(?:(and|or)|(?:\(\w+\))))*):)?/;
const propRegex = /((?:(?:\w)+\.?)+)/;
const strategyRegex = /(?:(?:(?:;(\w+))|(<>|><|<\||>\||<|>|)?))?(!?)/;
const queryParamRegex = new RegExp(complexFilterRegex.source + propRegex.source + strategyRegex.source, "i");

enum DAY {
    START = "00:00:00",
    END = "23:59:59",
}

/**
 * Add a/multiple where clause on any (deep?) properties of the decorated entity
 */
export class SearchFilter extends AbstractFilter<SearchFilterOptions> {
    /** Enum of where condition strategy types */
    static readonly STRATEGY_TYPES = STRATEGY_TYPES;

    public apply({ queryParams, qb, whereExp }: AbstractFilterApplyArgs) {
        if (!queryParams) {
            return;
        }

        const { filters, nestedConditionsFilters } = this.getFiltersLists(queryParams);
        filters.forEach((filter) => this.applyFilterParam({ qb, whereExp, filter }));
        this.applyNestedConditionsFilters({ qb, whereExp, nestedConditionsFilters });

        // Fix TypeORM queryBuilder behavior where the first parsed "where" clause is of type "OR" > it would end up as a simple where clause, losing the OR
        qb.expressionMap.wheres = sortBy(prop("type"), qb.expressionMap.wheres);
    }

    /**
     * Retrieve a property default where strategy from its propName/propPath
     * @example
     * propPath = "name" -> return "STARTS_WITH"
     * propPath = "profilePicture.id" -> return "EXACT"
     */
    protected getPropertyDefaultWhereStrategy(propPath: string) {
        // If all entity props are enabled as filters, return default where strategy
        if (this.config.options.all) {
            return this.config.options.defaultWhereStrategy || STRATEGY_TYPES.EXACT;
        }

        const propFilter = this.config.properties.find((propFilter) =>
            typeof propFilter === "string" ? propFilter === propPath : propFilter[0] === propPath
        );

        return typeof propFilter === "string"
            ? this.config.options.defaultWhereStrategy || STRATEGY_TYPES.EXACT
            : this.formatWhereStrategy(propFilter[1]);
    }

    /**
     * Returns where strategy formatted as a valid keyof STRATEGY_TYPES
     * @example
     * strategyRaw = "startsWith" -> return "STARTS_WITH"
     */
    protected formatWhereStrategy(strategyRaw: string) {
        return camelToSnake(strategyRaw).toUpperCase() as STRATEGY_TYPES;
    }

    protected getWhereOperatorByStrategy(strategy: STRATEGY_TYPES, not: boolean, propCount: number): WhereOperator {
        let operator;
        switch (strategy) {
            default:
            case STRATEGY_TYPES.EXACT:
                operator = (not ? "!" : "") + "=";
                break;

            case STRATEGY_TYPES.IN:
                operator = (not ? "NOT " : "") + "IN";
                break;

            case STRATEGY_TYPES.IS:
                operator = "IS" + (not ? " NOT" : "");
                break;

            case STRATEGY_TYPES.EXISTS:
                operator = "IS" + (not ? " NOT" : "") + " NULL";
                break;

            case STRATEGY_TYPES.CONTAINS:
            case STRATEGY_TYPES.STARTS_WITH:
            case STRATEGY_TYPES.ENDS_WITH:
                operator = (not ? "NOT " : "") + "LIKE";
                break;

            case STRATEGY_TYPES.BETWEEN_STRICT:
                if (propCount === 0) {
                    operator = !not ? ">" : "<=";
                } else {
                    operator = !not ? "<" : ">=";
                }
                break;

            case STRATEGY_TYPES.LESS_THAN:
                operator = !not ? "<" : ">=";
                break;

            case STRATEGY_TYPES.LESS_THAN_OR_EQUAL:
                operator = !not ? "<=" : ">";
                break;

            case STRATEGY_TYPES.GREATER_THAN:
                operator = !not ? ">" : "<=";
                break;

            case STRATEGY_TYPES.GREATER_THAN_OR_EQUAL:
                operator = !not ? ">=" : "<";
                break;
        }

        return operator as WhereOperator;
    }

    protected getWhereParamByStrategy(strategy: STRATEGY_TYPES, propName: string, value: string | boolean | Date) {
        switch (strategy) {
            default:
                return { [propName]: value };

            case STRATEGY_TYPES.EXISTS:
                return {};

            case STRATEGY_TYPES.CONTAINS:
                return { [propName]: "%" + value + "%" };

            case STRATEGY_TYPES.STARTS_WITH:
                return { [propName]: value + "%" };

            case STRATEGY_TYPES.ENDS_WITH:
                return { [propName]: "%" + value };
        }
    }

    protected getWhereParamSlotByStrategy(strategy: STRATEGY_TYPES, paramName: string) {
        if (strategy === STRATEGY_TYPES.IN) {
            return `(:...${paramName})`;
        } else if (strategy === STRATEGY_TYPES.EXISTS) {
            return "";
        } else {
            return `:${paramName}`;
        }
    }

    protected getWhereParamValueByStrategy(
        strategy: STRATEGY_TYPES,
        column: ColumnMetadata,
        value: string,
        not: boolean,
        propCount: number
    ) {
        // If property is a datetime and the searched value only contains Date (=without time)
        if (column.type === "datetime" && value.indexOf(":") === -1) {
            // add start/end of day with time
            switch (strategy) {
                case STRATEGY_TYPES.LESS_THAN_OR_EQUAL:
                case STRATEGY_TYPES.GREATER_THAN:
                    return value + " " + DAY.END;

                case STRATEGY_TYPES.GREATER_THAN_OR_EQUAL:
                case STRATEGY_TYPES.LESS_THAN:
                    return value + " " + DAY.START;

                case STRATEGY_TYPES.BETWEEN:
                    if (Array.isArray(value)) {
                        value[0] = value[0] + " " + (!not ? DAY.END : DAY.START);
                        value[1] = value[1] + " " + (!not ? DAY.START : DAY.END);
                    }
                    return value;

                case STRATEGY_TYPES.BETWEEN_STRICT:
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
    protected getWhereStrategyByComparison(comparison: COMPARISON_OPERATOR) {
        switch (comparison) {
            case COMPARISON_OPERATOR.BETWEEN:
                return STRATEGY_TYPES.BETWEEN;

            case COMPARISON_OPERATOR.BETWEEN_STRICT:
                return STRATEGY_TYPES.BETWEEN_STRICT;

            case COMPARISON_OPERATOR.LESS_THAN:
                return STRATEGY_TYPES.LESS_THAN;

            case COMPARISON_OPERATOR.LESS_THAN_OR_EQUAL:
                return STRATEGY_TYPES.LESS_THAN_OR_EQUAL;

            case COMPARISON_OPERATOR.GREATER_THAN:
                return STRATEGY_TYPES.GREATER_THAN;

            case COMPARISON_OPERATOR.GREATER_THAN_OR_EQUAL:
                return STRATEGY_TYPES.GREATER_THAN_OR_EQUAL;
        }
    }

    /** Returns where arguments for a filter param: operator, condition and parameter */
    protected getWhereArgs({
        strategy,
        entityAlias,
        propName,
        rawValue,
        propCount,
        not,
        column,
    }: {
        strategy: STRATEGY_TYPES;
        entityAlias: string;
        propName: string;
        rawValue: string;
        propCount?: number;
        not: boolean;
        column: ColumnMetadata;
    }) {
        const paramName = propCount ? propName + "_" + propCount : propName;
        const value = this.getWhereParamValueByStrategy(strategy, column, rawValue, not, propCount);

        if (STRATEGY_TYPES.EXISTS === strategy) {
            // use not (if given) to reverse query param value
            not = not ? !parseStringAsBoolean(rawValue) : parseStringAsBoolean(rawValue);
        }

        if (STRATEGY_TYPES.BETWEEN !== strategy) {
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
    protected addWhereByStrategy({
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
        if (
            Array.isArray(filter.value) &&
            STRATEGY_TYPES.IN !== filter.strategy &&
            STRATEGY_TYPES.BETWEEN !== filter.strategy
        ) {
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
                            nestedMethod = STRATEGY_TYPES.BETWEEN_STRICT !== filter.strategy ? "orWhere" : "andWhere";
                        } else {
                            nestedMethod = STRATEGY_TYPES.BETWEEN_STRICT !== filter.strategy ? "andWhere" : "orWhere";
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
    protected getWhereStrategyIdentifier(
        strategyRaw: string,
        propPath: string,
        comparison: COMPARISON_OPERATOR
    ): STRATEGY_TYPES {
        let strategyIdentifier: STRATEGY_TYPES;
        if (strategyRaw) {
            if (STRATEGY_TYPES[strategyRaw as STRATEGY_TYPES]) {
                // Valid identifier was directly used in queryParamKey
                return strategyRaw as STRATEGY_TYPES;
            } else {
                // Format strategy to a proper strategy identifier
                strategyIdentifier = this.formatWhereStrategy(strategyRaw);

                // Check that strategy identifier is a valid one
                if (STRATEGY_TYPES[strategyIdentifier as STRATEGY_TYPES]) {
                    return strategyIdentifier as STRATEGY_TYPES;
                }
            }
        } else if (comparison) {
            // If no strategy was defined but there is a comparison operator, use it as shortcut for a strategy
            return this.getWhereStrategyByComparison(comparison);
        }

        // Either no strategy/comparison was given in queryParamKey or the strategy is not a valid one
        return this.getPropertyDefaultWhereStrategy(propPath);
    }

    /** Returns a FilterParam from splitting a string query param key */
    protected getFilterParam(key: string, rawValue: QueryParamValue): FilterParam {
        const matches = key.match(queryParamRegex);

        if (!matches) {
            return;
        }

        const [, nestedConditionRaw, typeRaw, propPath, strategyRaw, comparison, not] = matches;
        const column = this.getColumnMetaForPropPath(propPath);

        // Checks that propPath is enabled/valid && has a search value
        if (!this.isFilterEnabledForProperty(propPath) || !column || !isDefined(rawValue)) {
            return;
        }

        const isNestedConditionFilter = nestedConditionRaw !== typeRaw;
        // Use type/strategy from key or defaults
        const type = typeRaw ? (typeRaw as WhereType) : "and";
        const strategy = this.getWhereStrategyIdentifier(strategyRaw, propPath, comparison as COMPARISON_OPERATOR);

        // Remove actual filter WhereType from nested condition
        const nestedCondition = typeRaw ? nestedConditionRaw.slice(0, -typeRaw.length) : nestedConditionRaw;

        const formatIri = (value: string) => (isIriValidForProperty(value, column) ? formatIriToId(value) : value);

        // If query param value is a string and contains comma-separated values, make an array from it
        const formatedValue =
            typeof rawValue === "string"
                ? rawValue
                      .split(",")
                      .map((val) => val.trim())
                      .filter(Boolean)
                : rawValue;
        const value = Array.isArray(formatedValue) ? formatedValue.map(formatIri) : formatIri(formatedValue);

        return {
            type,
            strategy,
            isNestedConditionFilter,
            nestedCondition,
            propPath,
            not: Boolean(not),
            value,
            comparison: comparison as COMPARISON_OPERATOR,
        };
    }

    /** Returns filters & complex filters using nested conditions */
    protected getFiltersLists(queryParams: QueryParams) {
        const filters = [];
        const nestedConditionsFilters: NestedConditionsFilters = {};

        let key;
        for (key in queryParams) {
            const value = Array.isArray(queryParams[key])
                ? (queryParams[key] as string[]).filter(isDefined)
                : queryParams[key];
            const filter = this.getFilterParam(key, value);

            if (!filter) {
                continue;
            }

            if (filter.isNestedConditionFilter) {
                this.addFilterParamToNestedConditionsFilters(nestedConditionsFilters, filter);
            } else {
                filters.push(filter);
            }
        }

        return { filters, nestedConditionsFilters };
    }

    /** Add given filter param to its nested condition key */
    protected addFilterParamToNestedConditionsFilters(
        nestedConditionsFilters: NestedConditionsFilters,
        filter: FilterParam
    ) {
        const regex = /(and|or)|(\((\w+)\))/i;
        const conditionPath = [];
        let matches;
        let str = filter.nestedCondition;
        let wasPreviousMatchIdentifier = filter.nestedCondition.startsWith("(");

        while ((matches = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matches.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const [, type, identifierRaw, identifier] = matches;

            // Since previousMatch was an identifier and is now followed by another identifier
            // AND was implicit so we add it manually here
            if (wasPreviousMatchIdentifier && identifierRaw) {
                conditionPath.push("and");
            }

            // Keep track of this match kind (either whereType or condition identifier)
            wasPreviousMatchIdentifier = Boolean(identifierRaw);

            // Move on to the next possible match
            str = str.replace(type || identifierRaw, "");

            // Push w/e was found
            conditionPath.push(type ? type : identifier);
        }

        if (!path(conditionPath, nestedConditionsFilters)) {
            setNestedKey(nestedConditionsFilters, conditionPath, []);
        }

        const filters: FilterParam[] = path(conditionPath, nestedConditionsFilters);
        filters.push(filter);
    }

    /** Apply a filter param by adding a where clause to its property & add needed joins if the property is nested */
    protected applyFilterParam({ qb, whereExp, filter }: ApplyFilterParamArgs) {
        const props = filter.propPath.split(".");

        let column;
        let propPath = filter.propPath;
        // Handle case when filter.propPath is a direct relation of entity
        // (ex: pictures;exists=true instead of pictures.id;exists=true)
        if (props.length === 1) {
            column = this.getColumnMetaForPropPath(filter.propPath);

            // Adding ".id" if it was not explicitly given in propPath so that we can add necessary joins
            if (column.propertyName === "id") {
                propPath += ".id";
            }
        }

        if (props.length === 1 && column.propertyName !== "id") {
            this.addWhereByStrategy({
                whereExp,
                entityAlias: this.entityMetadata.tableName,
                filter,
                propName: propPath,
                column,
            });
        } else {
            const { entityAlias, propName, columnMeta: column } = this.normalizer.makeJoinsFromPropPath(
                qb,
                this.entityMetadata,
                propPath,
                props[0]
            );

            this.addWhereByStrategy({ whereExp, entityAlias, filter, propName, column });
        }
    }

    /** Recursively browse through every nested conditions object and add them */
    protected applyNestedConditionsFilters({ qb, whereExp, nestedConditionsFilters }: ApplyNestedConditionFiltersArgs) {
        const recursiveBrowseFilter = (
            object: Record<string, any>,
            whereExp: WhereExpression,
            isWhereType: boolean
        ) => {
            for (let property in sortObjectByKeys(object)) {
                if (Array.isArray(object[property])) {
                    // Avoid losing the "OR" if it's parsed first
                    const sortedFilters = sortBy(prop("type"), object[property]);

                    // Add parenthesis around condition identifier
                    whereExp.andWhere(
                        new Brackets((nestedWhereExp) => {
                            sortedFilters.forEach((filter: FilterParam) => {
                                this.applyFilterParam({ qb, whereExp: nestedWhereExp, filter });
                            });
                        })
                    );
                } else if (typeof object[property] === "object" && isWhereType) {
                    whereExp[(property.toLowerCase() + "Where") as WhereMethod](
                        new Brackets((nestedWhereExp) => {
                            recursiveBrowseFilter(object[property], nestedWhereExp, false);
                        })
                    );
                } else {
                    recursiveBrowseFilter(object[property], whereExp, true);
                }
            }
        };

        recursiveBrowseFilter(nestedConditionsFilters, whereExp, true);
    }
}

export type FilterParam = {
    type: WhereType;
    isNestedConditionFilter: boolean;
    nestedCondition?: string;
    propPath: string;
    strategy: STRATEGY_TYPES;
    not: boolean;
    value: QueryParamValue;
    comparison: COMPARISON_OPERATOR;
};

type NestedConditionsFilters = Record<string, any>;

interface ApplyFilterParamArgs extends AbstractFilterApplyArgs {
    filter: FilterParam;
}

interface ApplyNestedConditionFiltersArgs extends AbstractFilterApplyArgs {
    nestedConditionsFilters: NestedConditionsFilters;
}
