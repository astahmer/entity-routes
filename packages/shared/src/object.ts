import { isDate, isDefined, isObject } from "./asserts";
import { ObjectLiteral } from "./types";

/** Sort object keys alphabetically */
export const sortObjectByKeys = (obj: ObjectLiteral) =>
    Object.keys(obj)
        .sort()
        .reduce((acc, key) => ((acc[key] = obj[key]), acc), {} as ObjectLiteral);

/** Get 1st key of object */
export const getObjectOnlyKey = (obj: object) => Object.keys(obj)[0];

export const getUnixTimestampFromDate = (date: Date) => Math.round(+date / 1000);

/** Set value of nested object key path */
export const setNestedKey = (obj: ObjectLiteral, path: string | string[], value: any): ObjectLiteral => {
    path = Array.isArray(path) ? path : path.split(".");
    if (path.length === 1) {
        obj[path[0]] = value;
        return value;
    } else if (!(path[0] in obj)) {
        obj[path[0]] = {};
    }

    return setNestedKey(obj[path[0]], path.slice(1), value);
};

export function fromEntries<K extends string, V>(iterable: Iterable<readonly [K, V]> | Array<[K, V]>): Record<K, V> {
    return [...iterable].reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
    }, {} as Record<K, V>);
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

export const pickF = <T, K extends keyof T>(paths: K[]) => (obj: T) => pick(obj, paths);

/** Creates an object composed of the picked object properties that satisfies the condition for each value */
export function pickBy<T, K extends keyof T>(obj: T, paths: K[], fn: (value: any) => boolean): Partial<Pick<T, K>> {
    return {
        ...paths.reduce((mem, key) => ({ ...mem, ...(fn(obj[key]) ? { [key]: obj[key] } : {}) }), {}),
    } as Pick<T, K>;
}

export const pickDefined = <T, K extends keyof T>(obj: T, paths: K[]) => pickBy(obj, paths, isDefined);

export const get = <T extends object>(item: T, path: string, defaultValue?: any) =>
    path.split(".").reduce((obj, key) => (obj ? obj[key as keyof typeof obj] : defaultValue), item);

export const prop = <T extends object, K extends keyof T>(key: K) => (item: T) => item[key];
export const propEntries = <T extends object, K extends keyof T>(keys: K[]) => (item: T) =>
    keys.map((k) => [k, item[k]] as const);

export const getSelf = <T = any>(value: T) => value;

export function deepMerge<A, B, C, D, E>(obj1: A, obj2: B, obj3?: C, obj4?: D, obj5?: E): A & B & C & D & E;
export function deepMerge<T extends ObjectLiteral[]>(...objects: Partial<T>[]): Partial<T> {
    function deepMergeInner(target: ObjectLiteral, source: ObjectLiteral, options: DeepMergeOptions) {
        Object.keys(source).forEach((key: string) => {
            const targetValue = target[key];
            const sourceValue = source[key];

            if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                const sourceValues = options.withUniqueArrayValues
                    ? sourceValue.filter((value) => !targetValue.includes(value))
                    : sourceValue;
                target[key] = targetValue.concat(sourceValues);
            } else if (isObject(targetValue) && isObject(sourceValue)) {
                target[key] = deepMergeInner(Object.assign({}, targetValue), sourceValue, options);
            } else {
                target[key] = sourceValue;
            }
        });

        return target;
    }

    const target = objects.shift();
    const optionsObj = pickDefined((objects[objects.length - 1] || {}) as DeepMergeOptions, deepMergeOptionKeys);
    const options = Object.keys(optionsObj).length ? objects.pop() : {};
    const mergeable = objects.filter(isObject);

    if (!mergeable.length) return target;

    let source: object;
    while ((source = mergeable.shift())) {
        deepMergeInner(target, source, options);
    }

    return target;
}

export type DeepMergeOptions = { withUniqueArrayValues?: boolean };
export const deepMergeOptionKeys: Array<keyof DeepMergeOptions> = ["withUniqueArrayValues"];

// Adapted from https://github.com/IndigoUnited/js-deep-sort-object/blob/master/index.js
function defaultSortFn(a: string, b: string) {
    return a.localeCompare(b);
}
export type ComparatorFn = (a: string, b: string) => number;

export function deepSort<T>(src: T, comparator: ComparatorFn = defaultSortFn): T {
    function deepSortInner(src: ObjectLiteral, comparator: ComparatorFn): ObjectLiteral | ObjectLiteral[] {
        if (Array.isArray(src)) {
            return src.map((item) => deepSort(item, comparator));
        }

        if (isObject(src) && !isDate(src)) {
            const out: ObjectLiteral = {};
            Object.keys(src)
                .sort(comparator)
                .forEach((key) => (out[key as keyof typeof out] = deepSort(src[key as keyof typeof src], comparator)));

            return out;
        }

        return src;
    }

    return deepSortInner(src, comparator) as T;
}
