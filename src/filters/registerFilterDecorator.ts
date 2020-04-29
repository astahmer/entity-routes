import { getRouteFiltersMeta, ROUTE_FILTERS_METAKEY, RouteFiltersMeta } from "@/services/EntityRouter";

import { FilterProperty, AbstractFilterConfig, DefaultFilterOptions } from "./AbstractFilter";

export function registerFilterDecorator({
    defaultConfig,
    propsOrOptions,
    propFilterHook,
}: {
    defaultConfig: Partial<AbstractFilterConfig>;
    propsOrOptions: FilterProperty[] | DefaultFilterOptions;
    propFilterHook?: (propName: string, filterConfig?: any) => FilterProperty;
}): PropertyDecorator | ClassDecorator {
    return (target: object | Function, propName: string, _descriptor?: PropertyDescriptor) => {
        if (typeof target === "object") {
            target = target.constructor;
        }

        const filtersMeta: RouteFiltersMeta = getRouteFiltersMeta(target as Function) || {};
        const filter: AbstractFilterConfig = filtersMeta[defaultConfig.class.name];

        // If all entity properties are enabled as filter, ignore this property decorator
        if (filter && filter.options.all) {
            return;
        }

        if (propName) {
            // Property Decorator
            const propFilter = propFilterHook(propName, filter || defaultConfig);

            if (filter) {
                filter.properties.push(propFilter);
            } else {
                defaultConfig.properties = [propFilter];
            }
        } else if (Array.isArray(propsOrOptions)) {
            // Class Decorator & properties were not skipped
            defaultConfig.properties = filter ? filter.properties.concat(propsOrOptions) : propsOrOptions;
        }

        // Update filter
        filtersMeta[defaultConfig.class.name] = defaultConfig as AbstractFilterConfig;
        Reflect.defineMetadata(ROUTE_FILTERS_METAKEY, filtersMeta, target);
    };
}
