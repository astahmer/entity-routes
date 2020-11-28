import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    DefaultFilterOptions,
    FilterDefaultConfig,
    parseStringAsBoolean,
    registerFilterDecorator,
} from "@entity-routes/core";

export type CacheFilterOptions = DefaultFilterOptions & {
    enabled?: boolean;
    expireTime?: number;
    defaultExpireTime?: number;
};

const getCacheFilterDefaultConfig: () => FilterDefaultConfig<CacheFilterOptions> = () => ({
    class: CacheFilter,
    options: { enabled: true, defaultExpireTime: 300 },
});

export function Cache(enabled: boolean = true, expireTime?: number): ClassDecorator {
    return (target: object | Function) => {
        const defaultConfig = getCacheFilterDefaultConfig();
        registerFilterDecorator<CacheFilterOptions>({
            target,
            defaultConfig,
            options: { enabled, expireTime },
            properties: [],
        });
    };
}

export class CacheFilter extends AbstractFilter<CacheFilterOptions> {
    apply({ qb, queryParams = {} }: Pick<AbstractFilterApplyArgs, "qb" | "queryParams">) {
        if ("cached" in queryParams || this.config.options.enabled) {
            const enabled =
                "cached" in queryParams
                    ? parseStringAsBoolean(queryParams["cached"] as string)
                    : this.config.options.enabled;
            const expireTime = parseInt(queryParams["cacheTime"] as string) || this.config.options.expireTime;
            qb.cache(enabled, expireTime);
        }
    }
}
