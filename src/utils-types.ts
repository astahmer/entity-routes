import { GenericEntity } from "./router/EntityRouter";
import { ObjectType } from "typeorm";

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;
export type Props<T extends GenericEntity> = NonFunctionKeys<T>;

// https://github.com/piotrwitek/utility-types#nonfunctionkeyst
export type NonUndefined<A> = A extends undefined ? never : A;
export type NonFunctionKeys<T extends object> = {
    [K in keyof T]-?: NonUndefined<T[K]> extends Function ? never : K;
}[keyof T];
export type FunctionKeys<T extends object> = Exclude<keyof T, NonFunctionKeys<T>>;

export type ObjectKeys<T extends object> = {
    [K in keyof T]: T[K] extends object ? (T[K] extends Function ? never : T[K] extends Date ? never : K) : never;
}[keyof T];

export type EntityKeys<T extends GenericEntity> = {
    [K in keyof T]: T[K] extends GenericEntity ? K : never;
}[keyof T];

export type EntityReference = <Entity extends GenericEntity>(type?: Entity) => ObjectType<Entity>;
