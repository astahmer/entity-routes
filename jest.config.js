// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const path = require("path");

const threshold = 80;
const rootDir = path.resolve(__dirname);
const setupFilePath = path.join(rootDir, "./jest.setup.ts");

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/tests/$1",
    },
    globals: { "ts-jest": { tsconfig: "<rootDir>/tests/tsconfig.json" } },
    setupFilesAfterEnv: ["jest-extended", setupFilePath],
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
