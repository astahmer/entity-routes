import { ObjectType } from "typeorm";

import { GenericEntity } from "./router/EntityRouter";

export type ObjectLiteral = Record<string, any>; // TODO use everywhere instead of record ?
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;
export type Props<T extends GenericEntity> = NonFunctionKeys<T>;
export type Decorator = (target: Object | Function, propName?: string) => void;
export type CType<T = any> = new (...args: any[]) => T;

/**
 * Same as Partial<T> but goes deeper and makes Partial<T> all its properties and sub-properties.
 `*/
type DP<T> = {
    [P in keyof T]?: T[P] extends Array<infer U>
        ? Array<DeepPartial<U>>
        : T[P] extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepPartial<U>>
        : DeepPartial<T[P]>;
};

export declare type DeepPartial<T> = { [P in keyof T]?: T[P] | DP<T> };

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
