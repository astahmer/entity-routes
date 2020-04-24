import {
    STRATEGY_TYPES,
    SearchFilterOptions,
    FilterProperty,
    getSearchFilterDefaultConfig,
    AbstractFilterConfig,
    registerFilterDecorator,
} from "..";

/**
 * SearchFilter PropertyDecorator
 * @example [at]SearchFilter(STRATEGY_TYPES.EXISTS)
 */
export function Search(strategy?: STRATEGY_TYPES): PropertyDecorator;

/**
 * SearchFilter ClassDecorator
 * @example [at]SearchFilter({ all: true })
 */
export function Search(options?: SearchFilterOptions): ClassDecorator;

/**
 * SearchFilter ClassDecorator
 * @example
 * [at]SearchFilter(["id", "banks.id", ["banks.coverPicture", "STRATEGY_TYPES.EXISTS"]], {
 *      defaultWhereStrategy: STRATEGY_TYPES.STARTS_WITH
 * })
 */
export function Search(properties: FilterProperty[], options?: SearchFilterOptions): ClassDecorator;

export function Search(
    propParamOrFilterPropertiesOrOptions?: STRATEGY_TYPES | FilterProperty[] | SearchFilterOptions,
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
