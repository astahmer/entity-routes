// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const threshold = 85;

const path = require("path");
const rootDir = path.resolve(__dirname);
const setupFilePath = path.join(rootDir, "./jest.setup.ts");

const base = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir,
    moduleNameMapper: {
        "@entity-routes/(.*)": "<rootDir>/packages/$1/src",
    },
    globals: { "ts-jest": { tsconfig: path.join(rootDir, "./tsconfig.test.json") } },
    setupFilesAfterEnv: ["jest-extended", setupFilePath],
    collectCoverageFrom: ["<rootDir>/packages/*/src/**/*.ts"],
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

module.exports = {
    base,
    scoped: (pkgDir, pkgThreshold) => {
        const pkgName = path.basename(pkgDir);
        const currentPackage = `packages/${pkgName}`;
        const pkgRootDir = `<rootDir>/${currentPackage}`;
        // console.log({ pkgName, currentPackage, pkgRootDir, rootDir, __dirname });

        // Only make test & collect coverage from package calling jest
        return {
            ...base,
            roots: [pkgDir],
            collectCoverageFrom: [`${pkgRootDir}/src/**/*.ts`],
            coverageDirectory: `${pkgRootDir}/coverage`,
            coverageThreshold: {
                global: {
                    branches: pkgThreshold || threshold,
                    functions: pkgThreshold || threshold,
                    lines: pkgThreshold || threshold,
                    statements: pkgThreshold || threshold,
                },
            },
        };
    },
};
