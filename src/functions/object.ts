import { isObject } from "@/functions/asserts";

/** Sort object keys alphabetically */
export const sortObjectByKeys = (obj: Record<any, any>) =>
    Object.keys(obj)
        .sort()
        .reduce((acc, key) => ((acc[key] = obj[key]), acc), {} as any);

/** Get 1st key of object */
export const getObjectOnlyKey = (obj: object) => Object.keys(obj)[0];

export const getUnixTimestampFromDate = (date: Date) => Math.round(+date / 1000);

/** Set value of nested object key path */
export const setNestedKey = (obj: Record<string, any>, path: string | string[], value: any): Record<string, any> => {
    path = Array.isArray(path) ? path : path.split(".");
    if (path.length === 1) {
        obj[path[0]] = value;
        return value;
    } else if (!(path[0] in obj)) {
        obj[path[0]] = {};
    }

    return setNestedKey(obj[path[0]], path.slice(1), value);
};

export function fromEntries(iterable: Iterable<any>) {
    return [...iterable].reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
    }, {});
}

/**
 * Creates an object composed of the picked object properties.
 * @param obj The source object
 * @param paths The property paths to pick
 * @see https://gist.github.com/bisubus/2da8af7e801ffd813fab7ac221aa7afc
 */
export function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
    return { ...paths.reduce((mem, key) => ({ ...mem, [key]: obj[key] }), {}) } as Pick<T, K>;
}

export const get = <T extends object>(item: T, path: string, defaultValue?: any) =>
    path.split(".").reduce((obj, key) => (obj ? obj[key as keyof typeof obj] : defaultValue), item);

export const prop = <T extends object, K extends keyof T>(key: K) => (item: T) => item[key];
export const getSelf = <T = any>(value: T) => value;

export function deepMerge(...objects: object[]) {
    function deepMergeInner(target: object, source: object) {
        Object.keys(source).forEach((key: string) => {
            const targetValue = (target as any)[key];
            const sourceValue = (source as any)[key];

            if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                (target as any)[key] = targetValue.concat(sourceValue);
            } else if (isObject(targetValue) && isObject(sourceValue)) {
                (target as any)[key] = deepMergeInner(Object.assign({}, targetValue), sourceValue);
            } else {
                (target as any)[key] = sourceValue;
            }
        });

        return target;
    }

    const target = objects.shift();
    const mergeable = objects.filter(isObject);

    if (!mergeable.length) return target;

    let source: object;
    while ((source = mergeable.shift())) {
        deepMergeInner(target, source);
    }

    return target;
}
