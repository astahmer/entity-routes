import { getRouteFiltersMeta, ROUTE_FILTERS_METAKEY, RouteFiltersMeta } from "@/router/EntityRouter";

import { FilterProperty, AbstractFilterConfig, DefaultFilterOptions, FilterDefaultConfig } from "./AbstractFilter";

export function registerFilterDecorator<Options = DefaultFilterOptions>({
    target,
    defaultConfig,
    options = {} as Options,
    properties = [],
}: RegisterFilterDecoratorArgs<Partial<Options>>) {
    // All filters config registered on Entity
    const filtersMeta: RouteFiltersMeta = getRouteFiltersMeta(target as Function) || {};

    // Retrieve current config or init one with default config
    const config: Partial<AbstractFilterConfig> = filtersMeta[defaultConfig.class.name] || defaultConfig;

    // Merge current/default with params
    config.options = { ...defaultConfig.options, ...config.options, ...options };
    config.properties = [...new Set([...(config.properties || []), ...properties])];

    // Update filter
    filtersMeta[defaultConfig.class.name] = config as AbstractFilterConfig;
    Reflect.defineMetadata(ROUTE_FILTERS_METAKEY, filtersMeta, target);
}

export type RegisterFilterDecoratorArgs<Options = DefaultFilterOptions> = {
    /** Entity class constructor */
    target: Object;
    defaultConfig: FilterDefaultConfig<Options>;
    options?: Options;
    properties?: FilterProperty[];
};
