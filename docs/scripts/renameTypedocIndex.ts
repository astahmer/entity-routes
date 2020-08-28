import fs from "fs/promises";

const replace = require("replace-in-file");
const consola = require("consola");

export async function renameTypedocIndex({ fromPath }) {
    consola.info("Renaming `globals.md` to `definitions.md` in Typedoc generated files root");
    try {
        await fs.unlink(fromPath + "/index.md");
        await fs.rename(fromPath + "/globals.md", fromPath + "/definitions.md");
        const options = {
            files: fromPath + "/**",
            from: [/globals\.md#/g, "[@astahmer/entity-routes](index.md) › [Globals](globals.md)", "## Index"],
            to: ["definitions#", "", ""],
        };
        const results = await replace(options);
        const changedResults = results.filter((item) => item.hasChanged);
        consola.success(`Done renaming & replacing ${changedResults.length} links`);
    } catch (error) {
        consola.error("Error while replacing index", error);
    }
}
