import { SelectQueryBuilder } from "typeorm";
import { Container } from "typedi";

import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    FilterDefaultConfig,
    DefaultFilterOptions,
    QueryParams,
    QueryParamValue,
} from "./AbstractFilter";
import { AliasManager } from "@/serializer";
import { RelationManager } from "@/serializer/RelationManager";
import { OrderByOptions } from "@/decorators/Pagination";

export class PaginationFilter extends AbstractFilter<PaginationFilterOptions> {
    get relationManager() {
        return Container.get(RelationManager);
    }

    /** Returns every filterable properties  */
    get filterProperties() {
        return this.config.properties
            ? this.config.properties.map((prop) => (typeof prop === "string" ? prop : prop[0]).split(":")[0])
            : [];
    }

    apply({
        queryParams = {},
        qb,
        aliasManager,
    }: Pick<AbstractFilterApplyArgs, "queryParams" | "qb" | "aliasManager">) {
        // Apply filter for each property provided if autoApply is enabled
        if (this.config.options.autoApplyOrderBys) {
            this.filterProperties.forEach((orderBy) => {
                this.addOrderBy(qb, aliasManager, orderBy || this.config.options.defaultOrderBys);
            });
        }

        // Apply filter for each query params
        const { orderBy, take, skip } = this.getFilterParamsByTypes(queryParams);
        this.addOrderBy(qb, aliasManager, orderBy || this.config.options.defaultOrderBys);

        if (take || this.config.options.defaultRetrievedItemsLimit) {
            qb.take(take || this.config.options.defaultRetrievedItemsLimit);
        }

        if (skip) {
            qb.skip(skip);
        }
    }

    protected getFilterParamsByTypes(queryParams: QueryParams) {
        return {
            orderBy: queryParams["orderBy"],
            take: parseInt(queryParams["take"] as string),
            skip: parseInt(queryParams["skip"] as string),
        };
    }

    /**
     * Add orderBys statements for each orderBy entry in queryParam array
     * @param qb
     * @param orderBy
     *
     * @example req = /pictures/?orderBy=title:desc&orderBy=downloads:desc
     * will generate this SQL: ORDER BY `picture`.`title` DESC, `picture`.`downloads` DESC
     */
    protected addOrderBy(qb: SelectQueryBuilder<any>, aliasManager: AliasManager, orderBy: QueryParamValue) {
        if (!Array.isArray(orderBy)) {
            orderBy = [orderBy];
        }

        let [i, length] = [0, orderBy.length];
        for (i; i < length; i++) {
            let [propPath, directionRaw] = orderBy[i].split(":");
            const props = propPath.split(".");
            const direction = (directionRaw
                ? directionRaw
                : this.config.options.defaultOrderDirection
            ).toUpperCase() as OrderDirectionCaps;

            // Checks that given direction is valid & that filter is both enabled & valid
            const column = this.getPropMetaAtPath(propPath);
            if (!isDirection(direction) || !this.isFilterEnabledForProperty(propPath) || !column) {
                continue;
            }

            // If last part of propPath is a relation (instead of a column), append ".id" to it
            if (
                this.entityMetadata.findRelationWithPropertyPath(props[0]) &&
                column.propertyName === "id" &&
                !propPath.endsWith(".id")
            ) {
                propPath += ".id";
                props.push("id");
            }

            // Add orderBy or join props until we can add orderBy to the last section of propPath
            if (props.length === 1) {
                qb.addOrderBy(this.entityMetadata.tableName + "." + props, direction);
            } else {
                const { entityAlias, propName } = this.relationManager.makeJoinsFromPropPath(
                    qb,
                    this.entityMetadata,
                    propPath,
                    props[0],
                    aliasManager
                );

                qb.addOrderBy(entityAlias + "." + propName, direction);
            }
        }
    }
}

export type PaginationFilterOptions = DefaultFilterOptions & {
    defaultOrderBys?: string | string[];
    defaultOrderDirection?: OrderDirection;
    defaultRetrievedItemsLimit?: number;
    /** If true, will order by every properties given without needing to add orderBy queryParam */
    autoApplyOrderBys?: boolean;
};

export type OrderDirectionCaps = "ASC" | "DESC";
export type OrderDirection = "asc" | "desc";
export const isDirection = (value: string): value is OrderDirection => ["asc", "desc", "ASC", "DESC"].includes(value);

export type PaginationTypes = "orderBy" | "take" | "skip";

export const getPaginationFilterDefaultConfig = (): FilterDefaultConfig<PaginationFilterOptions & OrderByOptions> => ({
    class: PaginationFilter,
    options: {
        all: false,
        defaultOrderBys: "id",
        defaultOrderDirection: "asc",
        defaultRetrievedItemsLimit: 100,
    },
});
