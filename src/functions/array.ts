import { PrimitiveValue } from "@/functions/primitives";
import { get, getSelf } from "@/functions/object";

/** Split an array in chunk of given size */
export const chunk = <T = any>(arr: T[], size: number): T[] =>
    arr.reduce((chunks, el, i) => (i % size ? chunks[chunks.length - 1].push(el) : chunks.push([el])) && chunks, []);

export const flatMapOnProp = <T, U, V>(arr: T[], getArrayProp: (v: T) => U[], getProp: (el: U) => V) =>
    arr.reduce((acc, item) => acc.concat(...getArrayProp(item).map(getProp)), []);

export const flatMap = <T, V = T>(arr: T[][], getProp: (subArray: T) => V = getSelf as any): V[] =>
    arr.reduce<V[]>((acc, item) => acc.concat(item.map(getProp)), []);

export const pluck = <K extends keyof T, T extends object>(arr: T[], prop: K) => arr.map((item) => item[prop]);

export type SortDirection = "asc" | "desc";
export function sortBy<T extends object, K extends keyof T>(arr: T[], key: K, dir: SortDirection = "asc") {
    return arr.sort((objA, objB) =>
        get(objA, key as string) - get(objB, key as string) > 0 ? (dir === "asc" ? -1 : 1) : dir === "asc" ? 1 : -1
    );
}

/** Compare arrays & return true if all members are included (order doesn't matter) */
export function isEqualArrays(arr1: PrimitiveValue[], arr2: PrimitiveValue[]) {
    if (arr1.length !== arr2.length) return false;

    let i;
    for (i = arr1.length; i--; ) {
        if (!arr2.includes(arr1[i])) return false;
    }
    return true;
}

/** Get values from the 2nd array that are not yet in the 1st  */
export const getUniqueValues = <T extends PrimitiveValue>(arr1: T[], arr2: T[]) =>
    arr2.filter((value) => !arr1.includes(value));

/** Combine one or more array into the first one while pushing only disctinct unique values */
export const combineUniqueValues = <T extends PrimitiveValue>(arr1: T[] = [], ...arr2: T[][]) =>
    arr2.reduce((acc, nextArr) => acc.concat(getUniqueValues(arr1, nextArr || [])), arr1);

export const last = <T>(value: T[]) => value[value.length - 1];
