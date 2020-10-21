import diff from "jest-diff";

import { isEqualArrays } from "@/functions/array";
import { isPrimitive } from "@/functions/asserts";

const arrayTester = (received: any, expected: any) =>
    Array.isArray(received) && Array.isArray(expected) && isPrimitive(received[0]) && isPrimitive(expected[0])
        ? isEqualArrays(received, expected)
        : undefined;

expect.extend({
    toEqualMessy(received, expected) {
        const options = {
            comment: "Deep object equality but without considering array keys orders",
            isNot: this.isNot,
            promise: this.promise,
        };

        const pass = this.equals(received, expected, [arrayTester]);
        const message = pass
            ? () =>
                  this.utils.matcherHint("toEqualMessy", undefined, undefined, options) +
                  "\n\n" +
                  `Expected: not ${this.utils.printExpected(expected)}\n` +
                  `Received: ${this.utils.printReceived(received)}`
            : () => {
                  const diffString = diff(expected, received, {
                      expand: this.expand,
                  });
                  return (
                      this.utils.matcherHint("toEqualMessy", undefined, undefined, options) +
                      "\n\n" +
                      (diffString && diffString.includes("- Expect")
                          ? `Difference:\n\n${diffString}`
                          : `Expected: ${this.utils.printExpected(expected)}\n` +
                            `Received: ${this.utils.printReceived(received)}`)
                  );
              };

        return { actual: received, message, pass };
    },
});
