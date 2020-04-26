// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

// const threshold = 50;

module.exports = {
    roots: ["<rootDir>/tests"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^$/(.*)$": "<rootDir>/$1",
    },
    // setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    setupFilesAfterEnv: ["jest-extended"],
    // coverageThreshold: {
    //     global: {
    //         branches: threshold,
    //         functions: threshold,
    //         lines: threshold,
    //         statements: threshold,
    //     },
    // },
    // coverageReporters: ["json", "lcov", "text", "clover"],
};
