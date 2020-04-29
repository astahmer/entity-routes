import { PaginationFilterOptions, getPaginationFilterDefaultConfig, OrderDirection } from "@/filters/PaginationFilter";
import { FilterProperty, AbstractFilterConfig } from "@/filters/AbstractFilter";
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
export function Pagination(properties?: FilterProperty[], options?: PaginationFilterOptions): ClassDecorator;

export function Pagination(
    propertiesOrOptions?: FilterProperty[] | PaginationFilterOptions,
    options?: PaginationFilterOptions
) {
    let properties: any[] = [];
    // If ClassDecorator & skipping properties
    if (!Array.isArray(propertiesOrOptions)) {
        options = propertiesOrOptions;
    }

    const defaultConfig = getPaginationFilterDefaultConfig(options);

    return registerFilterDecorator({
        defaultConfig,
        propsOrOptions: properties,
    }) as ClassDecorator;
}

/**
 * Pagination PropertyDecorator
 * @example [at]OrderBy("asc", "user.name")
 * @example [at]OrderBy("asc")
 */
export function OrderBy(direction?: OrderDirection, relationPropName?: string): PropertyDecorator {
    const defaultConfig = getPaginationFilterDefaultConfig();

    const withRelationPropName = relationPropName ? "." + relationPropName : "";
    const propFilterHook = (propName: string, filterConfig: AbstractFilterConfig<PaginationFilterOptions>) => {
        return propName + withRelationPropName + ":" + (direction || filterConfig.options.defautOrderDirection);
    };

    return registerFilterDecorator({
        defaultConfig,
        propsOrOptions: { direction, relationPropName },
        propFilterHook,
    });
}
