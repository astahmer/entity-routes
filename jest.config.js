// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

// const threshold = 50;

module.exports = {
    roots: ["<rootDir>/tests"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    // testEnvironment: "node",
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
