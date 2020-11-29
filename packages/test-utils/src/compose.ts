import { TestContext } from "./context";
import { TestMiddleware } from "./server";

// Adapted from https://github.com/koajs/compose/blob/master/index.js

export function compose(stack: TestMiddleware[]): TestMiddleware {
    return function (context: TestContext, next: TestMiddleware) {
        // last called middleware #
        let index = -1;
        return dispatch(0);

        function dispatch(i: number) {
            if (i <= index) return Promise.reject(new Error("next() called multiple times"));
            index = i;
            let fn = stack[i];
            if (i === stack.length) fn = next;
            if (!fn) return Promise.resolve();
            try {
                return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
            } catch (err) {
                return Promise.reject(err);
            }
        }
    };
}
