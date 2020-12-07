import { Container } from "typedi";
import { Brackets, ObjectLiteral, WhereExpression } from "typeorm";

import { get, isDefined, setNestedKey, sortBy, sortObjectByKeys } from "@entity-routes/shared";

import { RelationManager } from "../database";
import { formatIriToId, isIriValidForProperty, isWhereType } from "../functions";
import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    COMPARISON_OPERATOR,
    DefaultFilterOptions,
    FilterDefaultConfig,
    QueryParamValue,
    QueryParams,
    WhereMethod,
    WhereType,
} from "./AbstractFilter";
import { StrategyType, WhereManager } from ".";

/** Add a/multiple where clause on any (deep?) properties of the decorated entity  */
export class SearchFilter extends AbstractFilter<SearchFilterOptions, StrategyType> {
    get relationManager() {
        return Container.get(RelationManager);
    }

    get whereManager() {
        return Container.get(WhereManager);
    }

    public apply({ queryParams, qb, aliasHandler }: AbstractFilterApplyArgs) {
        if (!queryParams) {
            return;
        }

        const whereExp = qb as WhereExpression;
        const { filters, nestedConditionsFilters } = this.getFiltersLists(queryParams);
        filters.forEach((filter) => this.applyFilterParam({ qb, whereExp, filter, aliasHandler }));
        this.applyNestedConditionsFilters({ qb, whereExp, nestedConditionsFilters, aliasHandler });

        // Fix TypeORM queryBuilder behavior where the first parsed "where" clause is of type "OR"
        // -> it would end up as a simple where clause, losing the OR
        qb.expressionMap.wheres = sortBy(qb.expressionMap.wheres, "type");
    }

    /** Returns a FilterParam from splitting a string query param key */
    protected getFilterParam(key: string, rawValue: QueryParamValue): FilterParam {
        const matches = key.match(queryParamRegex);

        if (!matches) {
            return;
        }

        const [, nestedConditionRaw, typeRaw, propPath, strategyRaw, comparison, not] = matches;
        const column = this.getPropMetaAtPath(propPath);

        // Checks that propPath is enabled/valid && has a search value
        if (!this.isFilterEnabledForProperty(propPath) || !column || !isDefined(rawValue)) {
            return;
        }

        const isNestedConditionFilter = nestedConditionRaw !== typeRaw;
        // Use type/strategy from key or defaults
        const type = typeRaw ? (typeRaw as WhereType) : "and";
        const strategy = this.whereManager.getWhereStrategyIdentifier(
            this.config,
            strategyRaw,
            propPath,
            comparison as COMPARISON_OPERATOR
        );

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
        const value = formatedValue.map(formatIri);

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
        const conditionPath = [];
        let matches;
        let str = filter.nestedCondition;
        let wasPreviousMatchIdentifier = filter.nestedCondition.startsWith("(");

        while ((matches = nestedConditionRegex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matches.index === nestedConditionRegex.lastIndex) {
                nestedConditionRegex.lastIndex++;
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

        if (!get(nestedConditionsFilters, conditionPath.join("."))) {
            setNestedKey(nestedConditionsFilters, conditionPath, {});
        }

        const filters: Record<string | number, FilterParam> = get(nestedConditionsFilters, conditionPath.join("."));
        filters[Object.keys(filters).length] = filter;
    }

    /** Apply a filter param by adding a where clause to its property & add needed joins if the property is nested */
    protected applyFilterParam({ qb, whereExp, filter, aliasHandler }: ApplyFilterParamArgs) {
        const props = filter.propPath.split(".");

        let column;
        let propPath = filter.propPath;
        // Handle case when filter.propPath is a direct relation of entity
        // (ex: pictures;exists=true instead of pictures.id;exists=true)
        if (props.length === 1) {
            column = this.getPropMetaAtPath(filter.propPath);

            // Adding ".id" if it was not explicitly given in propPath so that we can add necessary joins
            if (column.propertyName === "id") {
                propPath += ".id";
            }
        }

        if (props.length === 1 && column.propertyName !== "id") {
            this.whereManager.addWhereByStrategy({
                whereExp,
                entityAlias: this.entityMetadata.tableName,
                filter,
                propName: propPath,
                column,
            });
        } else {
            const { entityAlias, propName, columnMeta: column } = this.relationManager.makeJoinsFromPropPath({
                qb,
                entityMetadata: this.entityMetadata,
                propPath,
                currentProp: props[0],
                aliasHandler,
            });

            if (!column) return;
            this.whereManager.addWhereByStrategy({ whereExp, entityAlias, filter, propName, column });
        }
    }

    /** Recursively browse through every nested conditions object and add them */
    protected applyNestedConditionsFilters({
        qb,
        whereExp,
        nestedConditionsFilters,
        aliasHandler,
    }: ApplyNestedConditionFiltersArgs) {
        let nested: FilterParam | NestedConditionsFilters;
        const recursiveBrowseFilter = (
            object: ObjectLiteral,
            whereExp: WhereExpression,
            whereType: WhereType = "and"
        ) => {
            for (let property in sortObjectByKeys(object)) {
                nested = object[property];
                if (!isWhereType(property)) {
                    const entries = Object.entries(sortObjectByKeys(nested));
                    const {
                        nestedConditions,
                        filterParams,
                    }: {
                        nestedConditions: [WhereType, NestedConditionsFilters][];
                        filterParams: FilterParam[];
                    } = entries.reduce(
                        (acc, [key, value]) => {
                            if (isWhereType(key)) {
                                acc.nestedConditions.push([key, value]);
                            } else {
                                acc.filterParams.push(value);
                            }

                            return acc;
                        },
                        { nestedConditions: [], filterParams: [] }
                    );

                    if (filterParams.length) {
                        // Avoid losing the "OR" if it's parsed first
                        const sortedFilterParams = sortBy(filterParams, "type");

                        // Add parenthesis around condition identifier
                        whereExp[(whereType + "Where") as WhereMethod](
                            new Brackets((nestedWhereExp) => {
                                sortedFilterParams.forEach((filter: FilterParam) => {
                                    this.applyFilterParam({
                                        qb,
                                        whereExp: nestedWhereExp,
                                        filter,
                                        aliasHandler,
                                    });
                                });
                            })
                        );
                    }

                    // Recursively apply nested conditions
                    nestedConditions.forEach(([whereType, condition]) =>
                        recursiveBrowseFilter(condition, whereExp, whereType)
                    );
                } else {
                    // and|or object containing either FilterParam or an other and|or object
                    // Wrap nested filters in WhereType
                    whereExp[(property.toLowerCase() + "Where") as WhereMethod](
                        new Brackets((nestedWhereExp) => {
                            recursiveBrowseFilter(nested, nestedWhereExp);
                        })
                    );
                }
            }
        };
        recursiveBrowseFilter(nestedConditionsFilters, whereExp);
    }
}

export type SearchFilterOptions = DefaultFilterOptions & { defaultWhereStrategy?: StrategyType };

export const getSearchFilterDefaultConfig = (): FilterDefaultConfig<SearchFilterOptions> => ({
    class: SearchFilter,
    options: {
        all: false,
        allNested: false,
        allShallow: false,
        defaultWhereStrategy: "EXACT",
    },
});

/**
 * Match complex filter (where type with optional condition identifier)
 * 1 group is the whole condition string without the colon at the end and the 2nd group is for the whereType (and|or)
 *
 * testedString => [fullMatch, group1, group2]
 * @example
 * and: => [and:, and, and]
 * or:  => [and:, and, and]
 * and(conditionIdentifier): => [and(conditionIdentifier):, and(conditionIdentifier), and]
 * or(randomStringName): => [or(randomStringName):, or(randomStringName), or]
 * and(firstCondition)or(nestedCondition): => [and(firstCondition)or(nestedCondition):, and(firstCondition)or(nestedCondition), or]
 */
const complexFilterRegex = /(?:((?:(?:(and|or)|(?:\(\w+\))))*):)?/;

/**
 * Match nested condition in complex filter
 * Will either match WhereType (and|or) OR conditionIdentifier (\w+) if there is any
 *
 * testedString => [fullMatch, group1, group2]
 * @example
 * and(key) => [(key), (key), key]
 * or => [or, or]
 */
const nestedConditionRegex = /(and|or)|(\((\w+)\))/i;

/**
 * Match a prop path, shallow or deep
 * @example
 * id
 * owner.email
 * owner.role.name
 */
const propRegex = /((?:(?:\w)+\.?)+)/;

/**
 * Match a WhereStrategy, either using words or comparison operator
 *
 * testedString => [fullMatch, strategyRaw, comparisonOperator, not]
 * @example
 * id;greaterThan => [;greaterThan, greaterThan]
 * id;greaterThan => [;greaterThan!, greaterThan, !]
 * id;> => [>, >]
 * id;>! => [>!, >, !]
 */
const strategyRegex = /(?:(?:(?:;(\w+))|(<>|><|<\||>\||<|>|)?))?(!?)/;

/**
 * Match a SearchFilter queryParam
 * Is a merge of ComplexFilterRegex + PropRegex + StrategyRegex merged
 *
 * Below are valid SearchFilter queryParam strings
 * @example
 * id<
 * id;greaterThan!
 * owner.id!
 * and:owner.role.id
 * and:owner.role.name;endsWith
 * or(key1):owner.birthDate<>
 * or(key1)and(nestedKey2):owner.id>
 * or(key1)and(nestedKey2):owner.email;startsWith!
 */
const queryParamRegex = new RegExp(complexFilterRegex.source + propRegex.source + strategyRegex.source, "i");

export type FilterParam = {
    type: WhereType;
    isNestedConditionFilter: boolean;
    nestedCondition?: string;
    propPath: string;
    strategy: StrategyType;
    not: boolean;
    value: QueryParamValue;
    comparison: COMPARISON_OPERATOR;
};

export type NestedConditionsFilters = ObjectLiteral;

export type ApplyFilterParamArgs = Omit<AbstractFilterApplyArgs, "queryParams"> & {
    filter: FilterParam;
    whereExp: WhereExpression;
};

export type ApplyNestedConditionFiltersArgs = Omit<AbstractFilterApplyArgs, "queryParams"> & {
    nestedConditionsFilters: NestedConditionsFilters;
    whereExp: WhereExpression;
};
