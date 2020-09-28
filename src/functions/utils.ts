import * as util from "util";

export const log = (obj: Object, options?: util.InspectOptions) =>
    console.dir(util.inspect(obj, { depth: 3, colors: true, ...options }));

export type Composable<T = any, R = any> = (item: T) => R;

export const compose = <T = any, R = any>(...functions: Composable<T, R>[]) => (item: T) =>
    functions.reduceRight((chain, func) => chain.then(func), Promise.resolve(item));

export const pipe = <T = any, R = any>(...functions: Composable<T, R>[]) => (item: T) =>
    functions.reduce((chain, func) => chain.then(func), Promise.resolve(item));
