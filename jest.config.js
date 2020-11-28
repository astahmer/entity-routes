// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const threshold = 80;

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/tests/$1",
    },
    globals: { "ts-jest": { tsconfig: "<rootDir>/tests/tsconfig.json" } },
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
    coverageThreshold: {
        global: {
            branches: threshold,
            functions: threshold,
            lines: threshold,
            statements: threshold,
        },
    },
    coverageReporters: ["lcov", "text"],
};
