import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { AliasHandler } from "@/mapping/AliasHandler";
import { isDefined } from "@/functions/asserts";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { pick } from "@/functions/object";

export abstract class AbstractFilter<FilterOptions extends DefaultFilterOptions = DefaultFilterOptions, T = string> {
    protected readonly config: AbstractFilterConfig<FilterOptions, T>;
    protected readonly entityMetadata: EntityMetadata;

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
    abstract apply({ queryParams, qb, aliasHandler }: AbstractFilterApplyArgs): void;

    /** Return column metadata if param exists in this entity properties or is a valid propPath from this entity */
    protected getPropMetaAtPath(propPath: string | string[]): ColumnMetadata;
    protected getPropMetaAtPath<T extends boolean>(
        propPath: string | string[],
        options: GetPropMetaAtPathOptions<T>
    ): T extends true ? RelationMetadata : ColumnMetadata;
    protected getPropMetaAtPath(propPath: string | string[], options?: GetPropMetaAtPathOptions) {
        return this.getPropMetaAtPathInEntity(propPath, this.entityMetadata, options);
    }

    protected getPropMetaAtPathInEntity(propPath: string | string[], entityMetadata: EntityMetadata): ColumnMetadata;
    protected getPropMetaAtPathInEntity<T extends boolean>(
        propPath: string | string[],
        entityMetadata: EntityMetadata,
        options: GetPropMetaAtPathOptions<T>
    ): T extends true ? RelationMetadata : ColumnMetadata;
    protected getPropMetaAtPathInEntity(
        propPath: string | string[],
        entityMetadata: EntityMetadata,
        options?: GetPropMetaAtPathOptions
    ): ColumnMetadata | RelationMetadata {
        propPath = Array.isArray(propPath) ? propPath : propPath.split(".");

        const column = entityMetadata.findColumnWithPropertyName(propPath[0]);
        const relation = column ? column.relationMetadata : entityMetadata.findRelationWithPropertyPath(propPath[0]);
        const nextProp = propPath.length > 1 ? propPath.slice(1) : ["id"];

        if (!column && !relation) {
            return null;
        }

        if (relation && nextProp.length === 1 && nextProp[0] === "id" && options?.shouldReturnRelationInsteadOfId) {
            return relation;
        }

        return relation && nextProp.length
            ? this.getPropMetaAtPathInEntity(nextProp, relation.inverseEntityMetadata)
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

    /** Returns an array of valid query params keys to filter */
    protected getPropertiesToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
        return Object.keys(queryParams).reduce((acc, param: string) => {
            if (
                this.isFilterEnabledForProperty(param) &&
                this.getPropMetaAtPath(param) &&
                isDefined(queryParams[param])
            ) {
                acc.push(param);
            }
            return acc;
        }, []);
    }

    /** Returns an object of valid query params key/value pairs to filter */
    protected getPropertiesQueryParamsToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
        const params = this.getPropertiesToFilter(queryParams);
        return pick(queryParams, params);
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
    aliasHandler: AliasHandler;
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

export type GetPropMetaAtPathOptions<T = boolean> = { shouldReturnRelationInsteadOfId: T };
