import { SearchFilterOptions, getSearchFilterDefaultConfig } from "@/filters/SearchFilter";
import { FilterProperty, AbstractFilterConfig } from "@/filters/AbstractFilter";
import { registerFilterDecorator } from "@/filters/registerFilterDecorator";
import { StrategyType } from "@/filters/WhereManager";
import { isType } from "@/index";

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
    stratOrPropsOrOptions?: StrategyType | FilterProperty[] | SearchFilterOptions,
    options: SearchFilterOptions = {}
): ClassDecorator | PropertyDecorator {
    return (target: object | Function, propName: string) => {
        // If propName is defined => PropertyDecorator, else it's a ClassDecorator
        const isPropDecorator = !!propName;
        target = isPropDecorator ? target.constructor : target;

        const defaultConfig = getSearchFilterDefaultConfig();
        let properties: FilterProperty[] = [];

        // PropDecorator
        if (isType<StrategyType>(stratOrPropsOrOptions, isPropDecorator)) {
            const whereStrategy =
                stratOrPropsOrOptions || options.defaultWhereStrategy || defaultConfig.options.defaultWhereStrategy;
            properties.push([propName, whereStrategy] as FilterProperty);
        } else {
            // ClassDecorator
            if (Array.isArray(stratOrPropsOrOptions)) {
                properties = stratOrPropsOrOptions;
            } else {
                options = stratOrPropsOrOptions;
            }
        }

        registerFilterDecorator({
            target,
            defaultConfig,
            properties,
            options,
        });
    };
}
