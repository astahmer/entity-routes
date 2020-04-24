import { GenericEntity } from "@/services/EntityRoute";

export const isDev = () => process.env.NODE_ENV === "development";

export const isDefined = (value: any) =>
    value !== undefined && value !== null && (typeof value === "string" ? value.trim() !== "" : true);

export const isPromise = <T = any>(p: any): p is Promise<T> =>
    p !== null && typeof p === "object" && typeof p.then === "function";

export const isType = <T>(_value: any, condition?: boolean): _value is T => condition;

export const isEntity = (value: any) => value instanceof Object && "id" in value;
