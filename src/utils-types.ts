import { ObjectType } from "typeorm";

import { GenericEntity } from "./router/EntityRouter";
import { PrimitiveValue } from "@/functions/index";

export type ObjectLiteral = Record<string, any>;
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;
export type Props<T extends GenericEntity> = NonFunctionKeys<T>;
export type Decorator = (target: Object | Function, propName?: string) => void;
export type CType<T = any> = new (...args: any[]) => T;
export type AnyFunction<T = any> = (...args: any[]) => T;
export type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>;

// From official doc
export type Unpacked<T> = T extends (infer U)[]
    ? U
    : T extends (...args: any[]) => infer U
    ? U
    : T extends Promise<infer U>
    ? U
    : T;

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

export type FilterFlags<Base, Condition> = {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
};
export type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
export type SubTypeObjectLiteral<T extends object> = Pick<T, ObjectKeys<T>>;

// https://github.com/piotrwitek/utility-types#nonfunctionkeyst
export type NonNeverKeys<T> = { [P in keyof T]: T[P] extends never ? never : P }[keyof T];
export type NonUndefined<A> = A extends undefined ? never : A;
export type NonFunctionKeys<T extends object> = {
    [K in keyof T]-?: NonUndefined<T[K]> extends Function ? never : K;
}[keyof T];
export type FunctionKeys<T extends object> = Exclude<keyof T, NonFunctionKeys<T>>;

export type ObjectKeys<T extends object> = {
    [K in keyof T]: T[K] extends ObjectLiteralType<T[K]> ? K : never;
}[keyof T];

export type EntityKeys<T extends GenericEntity> = {
    [K in keyof T]: T[K] extends GenericEntity ? K : never;
}[keyof T];

export type EntityReference = <Entity extends GenericEntity>(type?: Entity) => ObjectType<Entity>;

export type PrimitiveArrayKeys<T extends object> = AllowedNames<T, Array<PrimitiveValue>>;
export type ObjectOrArrayKeys<T extends object> = {
    [K in keyof T]: T[K] extends ObjectOrArrayType<T[K]> ? K : never;
}[keyof T];

export type CollectionKeys<T extends object> = {
    [K in keyof T]: T[K] extends Array<ObjectLiteralType<Unpacked<T[K]>>> ? K : never;
}[keyof T];

export type ObjectOrCollectionKeys<T extends object> = {
    [K in keyof T]: T[K] extends ObjectOrCollectionType<T[K]> ? K : never;
}[keyof T];

export type ObjectLiteralType<T> = T extends object
    ? T extends Function
        ? never
        : T extends Date
        ? never
        : T extends Array<any>
        ? never
        : T extends Promise<any>
        ? never
        : T
    : never;
export type ObjectOrArrayType<T> = T extends object
    ? T extends Function
        ? never
        : T extends Date
        ? never
        : T extends Promise<any>
        ? never
        : T
    : never;
export type ObjectOrCollectionType<T> = ObjectLiteralType<T> | Array<ObjectLiteralType<Unpacked<T>>>;
