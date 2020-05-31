import { getRandomString } from "@/functions/primitives";

/** Split an array in chunk of given size */
export const chunk = <T = any>(arr: T[], size: number): T[] =>
    arr.reduce((chunks, el, i) => (i % size ? chunks[chunks.length - 1].push(el) : chunks.push([el])) && chunks, []);

export const flatMapOnProp = <T, U, V>(arr: T[], getArrayProp: (v: T) => U[], getProp: (el: U) => V) =>
    arr.reduce((acc, item) => acc.concat(...getArrayProp(item).map(getProp)), []);

export const flatMap = <T, V>(arr: T[][], getProp: (subArray: T) => V): V[] =>
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
