const replace = require("replace-in-file");
const consola = require("consola");

export async function replaceMarkdownLinks({ fromPath }) {
    consola.info("Starting to replace links in Typedoc generated files");
    // Also fix "<>"" (by escaping it) which is used by COMPARISON_OPERATOR and would cause MDX to throw
    //  since it would be interpreted as a React jsx
    try {
        const options = {
            files: fromPath + "/**",
            from: [/\.md/g, `"<>"`],
            to: ["", `"<\\>"`],
        };
        await replace(options);
        consola.success("Done replacing links");
    } catch (error) {
        consola.error("Error while replacing links", error);
    }
}
