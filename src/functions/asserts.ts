import { Primitive } from "@/functions/primitives";
import { WhereType } from "@/filters/AbstractFilter";

export const isTestEnv = () => process.env.NODE_ENV === "test";
export const isDev = () => process.env.NODE_ENV === "development" || isTestEnv();

export const isDefined = (value: any) =>
    value !== undefined && value !== null && (typeof value === "string" ? value.trim() !== "" : true);

export const isObject = (value: any): value is object => value !== null && typeof value === "object";

export const isPrimitive = (value: any): value is Primitive =>
    (typeof value !== "object" && typeof value !== "function") || value === null;

export const isPromise = <T = any>(p: any): p is Promise<T> =>
    p !== null && typeof p === "object" && typeof p.then === "function";

export const isType = <T>(_value: any, condition?: boolean): _value is T => condition;

export const isEntity = (value: any) => value instanceof Object && "id" in value;
export const isWhereType = (property: string): property is WhereType => ["and", "or"].includes(property);
