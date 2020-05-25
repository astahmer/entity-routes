import { PaginationFilterOptions, getPaginationFilterDefaultConfig, OrderDirection } from "@/filters/PaginationFilter";
import { FilterProperty } from "@/filters/AbstractFilter";
import { registerFilterDecorator } from "@/filters/registerFilterDecorator";

/**
 * Pagination ClassDecorator without properties
 * @example
 * [at]Pagination()
 * [at]Pagination({ all: true })
 */
export function Pagination(options?: PaginationFilterOptions): ClassDecorator;

/**
 * Pagination ClassDecorator with properties
 * @example [at]Pagination(["id", ["name", "desc"], { defaultRetrievedItemsLimit: 10 })
 */
export function Pagination(
    properties?: FilterProperty<OrderDirection>[],
    options?: PaginationFilterOptions
): ClassDecorator;

export function Pagination(
    propsOrOptions?: FilterProperty[] | PaginationFilterOptions,
    options: PaginationFilterOptions = {}
) {
    return (target: object | Function) => {
        const defaultConfig = getPaginationFilterDefaultConfig();
        let properties: FilterProperty[] = [];

        if (Array.isArray(propsOrOptions)) {
            properties = propsOrOptions;
        } else {
            options = propsOrOptions;
        }

        registerFilterDecorator({
            target,
            defaultConfig,
            properties,
            options,
        });
    };
}

/**
 * Pagination PropertyDecorator
 * @example [at]OrderBy("asc", "user.name")
 * @example [at]OrderBy("asc")
 */
export function OrderBy(direction?: OrderDirection, relationPropName?: string): PropertyDecorator {
    return (target: object | Function, propName: string) => {
        const defaultConfig = getPaginationFilterDefaultConfig();
        const withRelationPropName = relationPropName ? "." + relationPropName : "";
        const propFilter =
            propName + withRelationPropName + ":" + (direction || defaultConfig.options.defaultOrderDirection);

        registerFilterDecorator<OrderByOptions>({
            target: target.constructor,
            defaultConfig,
            properties: [propFilter],
        });
    };
}
export type OrderByOptions = { direction: OrderDirection; relationPropName: string };
