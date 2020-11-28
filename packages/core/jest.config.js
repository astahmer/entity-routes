const baseConfig = require("../../jest.config");

module.exports = {
    ...baseConfig,
    setupFilesAfterEnv: ["jest-extended", "./jest.setup.ts"],
};
