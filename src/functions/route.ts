import { Primitive } from "@/functions/primitives";

export const formatRouteName = (path: string, operation: string) =>
    ((path[0] === "/" ? path.slice(1) : path) + "_" + operation).toLowerCase();

/**
 * Constistent way of parsing an array of queryString param
 * Solves the case where array.length is 1 and therefor value would not be in an array
 */
export const parseArrayQS = (query: Record<string, Primitive>, key: string) =>
    query[key + "[]"] ? (Array.isArray(query[key + "[]"]) ? query[key + "[]"] : [query[key + "[]"]]) : query[key];
