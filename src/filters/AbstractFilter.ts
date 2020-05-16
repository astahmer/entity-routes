import { pick } from "ramda";
import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import Container from "typedi";

import { Normalizer } from "@/serializer/Normalizer";
import { AliasManager } from "@/serializer/AliasManager";
import { isDefined } from "@/functions/asserts";

export abstract class AbstractFilter<FilterOptions extends DefaultFilterOptions = DefaultFilterOptions, T = string> {
    protected readonly config: AbstractFilterConfig<FilterOptions, T>;
    protected readonly entityMetadata: EntityMetadata;

    protected get normalizer() {
        return Container.get(Normalizer);
    }

    constructor({ config, entityMetadata }: AbstractFilterConstructor) {
        this.config = config as AbstractFilterConfig<FilterOptions, T>;
        this.entityMetadata = entityMetadata;
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
    abstract apply({ queryParams, qb, aliasManager }: AbstractFilterApplyArgs): void;

    /** Return column metadata if param exists in this entity properties or is a valid propPath from this entity */
    protected getColumnMetaForPropPath(param: string) {
        const propPath = param.indexOf(".") !== -1 ? param.split(".") : [param];
        return this.getColumnMetaForPropPathInEntity(propPath, this.entityMetadata);
    }

    protected getColumnMetaForPropPathInEntity(
        propPath: string | string[],
        entityMetadata: EntityMetadata
    ): ColumnMetadata {
        propPath = Array.isArray(propPath) ? propPath : propPath.split(".");

        const column = entityMetadata.findColumnWithPropertyName(propPath[0]);
        const relation = column ? column.relationMetadata : entityMetadata.findRelationWithPropertyPath(propPath[0]);
        const nextProp = propPath.length > 1 ? propPath.slice(1) : ["id"];

        if (!column && !relation) {
            return null;
        }

        return relation && nextProp.length
            ? this.getColumnMetaForPropPathInEntity(nextProp, relation.inverseEntityMetadata)
            : column;
    }

    /**
     * Returns true if given propPath filter is enabled or property was decorated
     * Nested properties using a path require being explicitly passed in properties array of this @ClassDecorator
     */
    protected isFilterEnabledForProperty(propPath: string) {
        const allNestedProps = this.config.options.allNested ? true : propPath.split(".").length === 1;
        if (this.config.options.all || (this.config.options.allShallow && allNestedProps)) {
            return true;
        } else {
            return this.filterProperties.indexOf(propPath) !== -1;
        }
    }

    /** Returns an array of valid query params to filter */
    protected getPropertiesToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
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

    protected getPropertiesQueryParamsToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
        const params = this.getPropertiesToFilter(queryParams);
        return pick(params, queryParams);
    }
}

export type AbstractFilterConstructor = {
    entityMetadata: EntityMetadata;
    config: Omit<AbstractFilterConfig, "class">;
};

export type QueryParamValue = string | string[];
export type QueryParams = Record<string, QueryParamValue>;

export type AbstractFilterApplyArgs = {
    queryParams: QueryParams;
    qb: SelectQueryBuilder<any>;
    aliasManager: AliasManager;
};

// @example: properties?: FilterProperty<T extends GenericEntity ? Props<T> : string, OrderDirection>[]
// export type FilterProperty<T = string, U = string> = T | [T, U];
export type FilterProperty<U = string> = string | [string, U];

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
    /** Make all property paths filtereable by default */
    all?: boolean;
    /** Make all (not nested) properties filterable by default */
    allShallow?: boolean;
    /** Make all nested property paths filtereable by default */
    allNested?: boolean;
};

export type AbstractFilterConfig<Options = DefaultFilterOptions, T = string> = {
    class: new ({ entityMetadata, config }: AbstractFilterConstructor) => any;
    properties: FilterProperty<T>[];
    options: Options;
};

export type FilterDefaultConfig<Options = DefaultFilterOptions> = Omit<
    AbstractFilterConfig<Partial<Options>>,
    "properties"
>;
