import consola from "consola";
import { replaceInFile } from "replace-in-file";

import { escapeRegex } from "./helpers";

const externalLinkRegex = /\[\w+\]\(\w+\/\w+\)/g;
const indexLinkRegex = /\[\w+\]\((..\/)?index#(\w+|-)+\)/g;

const DEFINITIONS_INDEX_FILE = "index.md";

export async function replaceTypedocLinks({ fromPath, prefix }: { fromPath: string; prefix: string }) {
    consola.info("Fixing typedoc links");
    try {
        // Remove .md from links
        await replaceInFile({
            files: fromPath + "/**",
            from: /\.md/g,
            to: "",
        });
        // Replace ../index by /definitions from links
        await replaceInFile({
            files: fromPath + "/**",
            from: new RegExp(escapeRegex("(../index"), "g"),
            to: "(" + prefix,
        });
        // Fix "<>" (by escaping it) which is used by COMPARISON_OPERATOR and would cause MDX to throw
        //  since it would be interpreted as a React jsx
        await replaceInFile({
            files: fromPath + "/**",
            from: `"<>"`,
            to: `"<\\>"`,
        });
        // Prepend /definitions to links
        await replaceInFile({
            files: fromPath + "/" + DEFINITIONS_INDEX_FILE,
            from: externalLinkRegex,
            to: (match: string) =>
                match.slice(0, match.indexOf("(")) + `(${prefix}/` + match.slice(match.indexOf("(") + 1),
        });
        // Replace index# to /definitions# from links
        await replaceInFile({
            files: fromPath + "/" + DEFINITIONS_INDEX_FILE,
            from: indexLinkRegex,
            to: (match: string) => match.replace("index#", `${prefix}#`),
        });
        // Remove breadcrumb & h2 from /definitions/DEFINITIONS_INDEX_FILE
        await replaceInFile({
            files: fromPath + "/" + DEFINITIONS_INDEX_FILE,
            from: ["[@astahmer/entity-routes](index)", "## Index"],
            to: "",
        });
        consola.success(`Done replacing typedoc links`);
    } catch (error) {
        consola.error("Error while replacing index", error);
    }
}
