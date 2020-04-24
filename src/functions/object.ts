import { Primitive, getRandomString } from "./primitives";

/** Sort object keys alphabetically */
export const sortObjectByKeys = (obj: Record<any, any>) =>
    Object.keys(obj)
        .sort()
        .reduce((acc, key) => ((acc[key] = obj[key]), acc), {} as any);

/** Get 1st key of object */
export const getObjectOnlyKey = (obj: object) => Object.keys(obj)[0];

export const getUnixTimestampFromDate = (date: Date) => Math.round(+date / 1000);

/** Set value of nested object key path */
export const setNestedKey = (obj: Record<string, any>, path: string[], value: any): Record<string, any> => {
    if (path.length === 1) {
        obj[path[0]] = value;
        return value;
    } else if (!(path[0] in obj)) {
        obj[path[0]] = {};
    }

    return setNestedKey(obj[path[0]], path.slice(1), value);
};

/** Split an array in chunk of given size */
export const chunk = <T = any>(arr: T[], size: number): T[] =>
    arr.reduce((chunks, el, i) => (i % size ? chunks[chunks.length - 1].push(el) : chunks.push([el])) && chunks, []);

/** Limit a number between a [min,max] */
export const limit = (nb: number, [min, max]: [number, number]) => Math.min(Math.max(nb, min), max);

/**
 * Constistent way of parsing an aray of queryString param
 * Solves the case where array.length is 1 and therefor value would not be in an array
 */
export const parseArrayQS = (query: Record<string, Primitive>, key: string) =>
    query[key + "[]"] ? (Array.isArray(query[key + "[]"]) ? query[key + "[]"] : [query[key + "[]"]]) : query[key];

/** Return an array where original array gets duplicated & appended X times */
export const appendArrayDuplicates = <T = any>(array: T[], count: number, idKey: string) => {
    let result: T[] = [];

    let i = 0;
    for (i; i < count; i++) {
        result = array.concat(
            result,
            array.reduce((acc) => acc.concat(array.map((item) => ({ ...item, [idKey]: getRandomString(5) }))), [])
        );
    }

    return result;
};
