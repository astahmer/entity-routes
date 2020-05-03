import { path, prop, sortBy } from "ramda";
import { Brackets, WhereExpression } from "typeorm";
import { Container } from "typedi";

import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    COMPARISON_OPERATOR,
    FilterDefaultConfig,
    DefaultFilterOptions,
    QueryParams,
    QueryParamValue,
    WhereMethod,
    WhereType,
} from "./AbstractFilter";
import { isDefined } from "@/functions/asserts";
import { setNestedKey, sortObjectByKeys } from "@/functions/object";
import { formatIriToId, isIriValidForProperty } from "@/functions/entity";
import { RelationManager } from "@/serializer/RelationManager";
import { StrategyType, WhereManager } from "@/filters/WhereManager";

// TODO Split in classes

/**
 * Add a/multiple where clause on any (deep?) properties of the decorated entity
 */
export class SearchFilter extends AbstractFilter<SearchFilterOptions> {
    get relationManager() {
        return Container.get(RelationManager);
    }

    get whereManager() {
        return Container.get(WhereManager);
    }

    public apply({ queryParams, qb, whereExp, aliasManager }: AbstractFilterApplyArgs) {
        if (!queryParams) {
            return;
        }

        const { filters, nestedConditionsFilters } = this.getFiltersLists(queryParams);
        filters.forEach((filter) => this.applyFilterParam({ qb, whereExp, filter, aliasManager }));
        this.applyNestedConditionsFilters({ qb, whereExp, nestedConditionsFilters, aliasManager });

        // Fix TypeORM queryBuilder behavior where the first parsed "where" clause is of type "OR"
        // -> it would end up as a simple where clause, losing the OR
        qb.expressionMap.wheres = sortBy(prop("type"), qb.expressionMap.wheres);
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
    protected applyFilterParam({ qb, whereExp, filter, aliasManager }: ApplyFilterParamArgs) {
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
            this.whereManager.addWhereByStrategy({
                whereExp,
                entityAlias: this.entityMetadata.tableName,
                filter,
                propName: propPath,
                column,
            });
        } else {
            const { entityAlias, propName, columnMeta: column } = this.relationManager.makeJoinsFromPropPath(
                qb,
                this.entityMetadata,
                propPath,
                props[0],
                aliasManager
            );

            this.whereManager.addWhereByStrategy({ whereExp, entityAlias, filter, propName, column });
        }
    }

    /** Recursively browse through every nested conditions object and add them */
    protected applyNestedConditionsFilters({
        qb,
        whereExp,
        nestedConditionsFilters,
        aliasManager,
    }: ApplyNestedConditionFiltersArgs) {
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
                                this.applyFilterParam({ qb, whereExp: nestedWhereExp, filter, aliasManager });
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

export type SearchFilterOptions = DefaultFilterOptions & { defaultWhereStrategy?: StrategyType };

export const getSearchFilterDefaultConfig = (): FilterDefaultConfig<SearchFilterOptions> => ({
    class: SearchFilter,
    options: {
        all: false,
        defaultWhereStrategy: "EXACT",
    },
});

const complexFilterRegex = /(?:((?:(?:(and|or)|(?:\(\w+\))))*):)?/;
const propRegex = /((?:(?:\w)+\.?)+)/;
const strategyRegex = /(?:(?:(?:;(\w+))|(<>|><|<\||>\||<|>|)?))?(!?)/;
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

type NestedConditionsFilters = Record<string, any>;

type ApplyFilterParamArgs = Omit<AbstractFilterApplyArgs, "queryParams"> & {
    filter: FilterParam;
};

type ApplyNestedConditionFiltersArgs = Omit<AbstractFilterApplyArgs, "queryParams"> & {
    nestedConditionsFilters: NestedConditionsFilters;
};
