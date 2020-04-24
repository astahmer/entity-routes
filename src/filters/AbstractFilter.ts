import { pick } from "ramda";
import { EntityMetadata, SelectQueryBuilder, WhereExpression } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { Normalizer } from "@/serializer/Normalizer";
import { AliasManager } from "@/serializer/AliasManager";
import { isDefined } from "@/functions/asserts";

export abstract class AbstractFilter<FilterOptions extends DefaultFilterOptions = DefaultFilterOptions> {
    protected config: AbstractFilterConfig<FilterOptions>;
    protected entityMetadata: EntityMetadata;
    protected normalizer: Normalizer;
    protected aliasManager: AliasManager;

    constructor({ config, entityMetadata, normalizer, aliasManager }: AbstractFilterConstructor) {
        this.config = config as AbstractFilterConfig<FilterOptions>;
        this.entityMetadata = entityMetadata;
        this.normalizer = normalizer;
        this.aliasManager = aliasManager;
    }

    // TODO Implement an interface that forces to have a getDescription method listing every possible filter key
    // Then use it each route's mapping to describe available filters & how to use them ?

    /** Returns every properties of this route entity */
    get entityProperties() {
        return this.entityMetadata.columns
            .reduce((acc: string[], column) => {
                if (!column.relationMetadata) {
                    acc.push(column.propertyName);
                }
                return acc;
            }, [])
            .concat(this.entityMetadata.relations.map((relation) => relation.propertyName));
    }

    /** Returns every filterable properties  */
    get filterProperties() {
        return this.config.properties.map((prop) => (typeof prop === "string" ? prop : prop[0]));
    }

    /** This method should add conditions to the queryBuilder using queryParams  */
    abstract apply({ queryParams, qb, whereExp }: AbstractFilterApplyArgs): void;

    /** Return column metadata if param exists in this entity properties or is a valid propPath from this entity */
    protected getColumnMetaForPropPath(param: string) {
        const propPath = param.indexOf(".") !== -1 ? param.split(".") : [param];
        return this.getColumnMetaForPropArrayPathInEntity(propPath, this.entityMetadata);
    }

    protected getColumnMetaForPropArrayPathInEntity(
        propPath: string[],
        entityMetadata: EntityMetadata
    ): ColumnMetadata {
        const column = entityMetadata.findColumnWithPropertyName(propPath[0]);
        const relation = column ? column.relationMetadata : entityMetadata.findRelationWithPropertyPath(propPath[0]);
        const nextProp = propPath.length > 1 ? propPath.slice(1) : ["id"];

        if (!column && !relation) {
            return null;
        }

        return column || this.getColumnMetaForPropArrayPathInEntity(nextProp, relation.inverseEntityMetadata);
    }

    /**
     * Returns true if given propPath filter is enabled or property was decorated
     * Nested properties using a path require being explicitly passed in properties array of this @ClassDecorator
     */
    protected isFilterEnabledForProperty(propPath: string) {
        const allNestedProps = this.config.options.allNested ? true : propPath.split(".").length === 1;
        if (this.config.options.all && allNestedProps) {
            return true;
        } else {
            return this.filterProperties.indexOf(propPath) !== -1;
        }
    }

    /** Returns an array of valid query params to filter */
    protected getPropertiesToFilter(queryParams: QueryParams) {
        return Object.keys(queryParams).reduce((acc, param: string) => {
            if (
                this.isFilterEnabledForProperty(param) &&
                this.getColumnMetaForPropPath(param) &&
                isDefined(queryParams[param])
            ) {
                acc.push(param);
            }
            return acc;
        }, []);
    }

    protected getPropertiesQueryParamsToFilter(queryParams: QueryParams) {
        const params = this.getPropertiesToFilter(queryParams);
        return pick(params, queryParams);
    }
}

export type AbstractFilterConstructor = {
    entityMetadata: EntityMetadata;
    config: AbstractFilterConfig;
    normalizer: Normalizer;
    aliasManager: AliasManager;
};

export type QueryParamValue = string | string[];
export type QueryParams = Record<string, QueryParamValue>;

export type AbstractFilterApplyArgs = {
    queryParams?: QueryParams;
    qb?: SelectQueryBuilder<any>;
    whereExp?: WhereExpression;
};

export type FilterProperty = string | [string, string];

export type WhereType = "and" | "or";
export type WhereMethod = "where" | "andWhere" | "orWhere";
export enum COMPARISON_OPERATOR {
    BETWEEN = "<>",
    BETWEEN_STRICT = "><",
    LESS_THAN = "<",
    LESS_THAN_OR_EQUAL = "<|",
    GREATER_THAN = ">",
    GREATER_THAN_OR_EQUAL = ">|",
}

export type SqlOperator = "LIKE" | "NOT_LIKE" | "IN" | "NOT_IN" | "IS" | "IS_NOT" | "IS_NULL" | "IS_NOT_NULL";
export type WhereOperator = "=" | "!=" | COMPARISON_OPERATOR | SqlOperator;

export type DefaultFilterOptions = {
    /** Property or dot delimited property path to apply the filter on */
    [key: string]: any;
    /** Make all (not nested) properties filterable by default */
    all?: boolean;
    /** Make all nested property paths filtereable by default */
    allNested?: boolean;
};

export type AbstractFilterConfig<Options = DefaultFilterOptions> = {
    class: new ({ entityMetadata, config }: AbstractFilterConstructor) => any;
    properties: FilterProperty[];
    options: Options;
};

export type FilterDefaultConfig<Options = DefaultFilterOptions> = Omit<AbstractFilterConfig<Options>, "properties">;
