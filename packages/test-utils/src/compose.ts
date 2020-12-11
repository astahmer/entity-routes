import { TestContext } from "./context";
import { TestMiddleware } from "./server";

// Adapted from https://github.com/koajs/compose/blob/master/index.js

export function compose(stack: TestMiddleware[]) {
    return async function composed(context: TestContext, next: TestMiddleware) {
        // last called middleware #
        let index = -1;
        return dispatch(0);

        async function dispatch(i: number) {
            return new Promise<void>((resolve, reject) => {
                if (i <= index) return reject(new Error("next() called multiple times"));
                index = i;
                const fn = i === stack.length ? next : stack[i];
                if (!fn) {
                    return resolve();
                }
                try {
                    return resolve(fn(context, dispatch.bind(null, i + 1)));
                } catch (err) {
                    return reject(err);
                }
            });
        }
    };
}
