import { SearchFilterOptions, getSearchFilterDefaultConfig } from "@/filters/SearchFilter";
import { FilterProperty, AbstractFilterConfig } from "@/filters/AbstractFilter";
import { registerFilterDecorator } from "@/filters/registerFilterDecorator";
import { StrategyType } from "@/filters/WhereManager";

/**
 * SearchFilter PropertyDecorator
 * @example [at]SearchFilter(StrategyType.EXISTS)
 */
export function Search(strategy?: StrategyType): PropertyDecorator;

/**
 * SearchFilter ClassDecorator
 * @example [at]SearchFilter({ all: true })
 */
export function Search(options?: SearchFilterOptions): ClassDecorator;

/**
 * SearchFilter ClassDecorator
 * @example
 * [at]SearchFilter(["id", "banks.id", ["banks.coverPicture", "EXISTS"]], {
 *      defaultWhereStrategy: "STARTS_WITH"
 * })
 */
export function Search(properties: FilterProperty[], options?: SearchFilterOptions): ClassDecorator;

export function Search(
    propParamOrFilterPropertiesOrOptions?: StrategyType | FilterProperty[] | SearchFilterOptions,
    options?: SearchFilterOptions
): ClassDecorator | PropertyDecorator {
    // If ClassDecorator & skipping properties
    if (
        !Array.isArray(propParamOrFilterPropertiesOrOptions) &&
        typeof propParamOrFilterPropertiesOrOptions === "object"
    ) {
        options = propParamOrFilterPropertiesOrOptions;
    }
    const defaultConfig = getSearchFilterDefaultConfig(options);

    // Property Decorator
    const propFilterHook = (propName: string, filterConfig: AbstractFilterConfig<SearchFilterOptions>) => {
        return [propName, propParamOrFilterPropertiesOrOptions || filterConfig.options.defaultWhereStrategy];
    };

    return registerFilterDecorator({
        defaultConfig,
        propsOrOptions: propParamOrFilterPropertiesOrOptions as any,
        propFilterHook: propFilterHook as any,
    });
}
