import { isType } from "@entity-routes/shared";

import {
    FilterProperty,
    SearchFilterOptions,
    StrategyType,
    getSearchFilterDefaultConfig,
    registerFilterDecorator,
} from "../filters";

/**
 * SearchFilter PropertyDecorator
 * @example [at]Search(StrategyType.EXISTS)
 */
export function Search(strategy?: StrategyType): PropertyDecorator;

/**
 * SearchFilter ClassDecorator
 * @example [at]Search({ all: true })
 */
export function Search(options?: SearchFilterOptions): ClassDecorator;

/**
 * SearchFilter ClassDecorator
 * @example
 * [at]Search(["id", "banks.id", ["banks.coverPicture", "EXISTS"]], {
 *      defaultWhereStrategy: "STARTS_WITH"
 * })
 */
export function Search(properties: FilterProperty<StrategyType>[], options?: SearchFilterOptions): ClassDecorator;

export function Search(
    stratOrPropsOrOptions?: StrategyType | FilterProperty<StrategyType>[] | SearchFilterOptions,
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
            properties.push(stratOrPropsOrOptions ? ([propName, stratOrPropsOrOptions] as FilterProperty) : propName);
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
