const replace = require("replace-in-file");
const consola = require("consola");

const destDir = "./src/pages/api-reference";

(async function run() {
    replaceMarkdownLinks();
})();

async function replaceMarkdownLinks() {
    consola.info("Starting to replace links in Typedoc generated files");
    try {
        const options = {
            files: destDir + "/**",
            from: [/\.md/g, `"<>"`],
            to: ["", `"<\\>"`],
        };
        await replace(options);
        consola.success("Done replacing links");
    } catch (error) {
        consola.error("Error while replacing links", error);
    }
}
