import "jest-extended";

declare global {
    namespace jest {
        interface Matchers<R> {
            toEqualMessy(expected: object): CustomMatcherResult;
        }
    }
}
