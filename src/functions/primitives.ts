export type PrimitiveValue = string | number | boolean;
export type Primitive = PrimitiveValue | Array<PrimitiveValue>;

export const lowerFirstLetter = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

export const truthyRegex = /^(true|1)$/i;
export const falsyRegex = /^(false|0)$/i;
export function parseStringAsBoolean(str: string) {
    if (truthyRegex.test(str)) {
        return true;
    } else if (falsyRegex.test(str)) {
        return false;
    }

    return null;
}

export const snakeToCamel = (str: string) => str.replace(/(_\w)/g, (group) => group[1].toUpperCase());
export const camelToSnake = (str: string) =>
    str.replace(/[\w]([A-Z])/g, (group) => group[0] + "_" + group[1]).toLowerCase();

export const getRandomString = (len = 10) =>
    Math.random().toString(36).substring(2, len) + Math.random().toString(36).substring(2, len);

export function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
