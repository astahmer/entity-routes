import { get, getSelf } from "@/functions/object";

/** Split an array in chunk of given size */
export const chunk = <T = any>(arr: T[], size: number): T[] =>
    arr.reduce((chunks, el, i) => (i % size ? chunks[chunks.length - 1].push(el) : chunks.push([el])) && chunks, []);

export const flatMapOnProp = <T, U, V>(arr: T[], getArrayProp: (v: T) => U[], getProp: (el: U) => V) =>
    arr.reduce((acc, item) => acc.concat(...getArrayProp(item).map(getProp)), []);

export const flatMap = <T, V>(arr: T[][], getProp: (subArray: T) => V = getSelf as any): V[] =>
    arr.reduce<V[]>((acc, item) => acc.concat(item.map(getProp)), []);

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

export const pluck = <K extends keyof T, T extends object>(arr: T[], prop: K) => arr.map((item) => item[prop]);

export type SortDirection = "asc" | "desc";
export function sortBy<T extends object, K extends keyof T>(arr: T[], key: K, dir: SortDirection = "asc") {
    return arr.sort((objA, objB) =>
        get(objA, key as string) - get(objB, key as string) > 0 ? (dir === "asc" ? -1 : 1) : dir === "asc" ? 1 : -1
    );
}
