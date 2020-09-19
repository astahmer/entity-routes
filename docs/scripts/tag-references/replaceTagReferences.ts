import { escapeRegex } from "../helpers";

const replace = require("replace-in-file");
const consola = require("consola");

const [openBracket, closeBracket] = ["[", "]"];

export type ReplaceTagReferencesArgs = {
    fromPath: string;
    ignorePath?: string;
    source: Record<string, string>;
    prefix?: string;
    name: string;
    dry?: boolean;
};

/** Replace tags from given source by its reference */
export async function replaceTagReferences({
    fromPath,
    ignorePath,
    source,
    prefix = "",
    name,
    dry,
}: ReplaceTagReferencesArgs) {
    const files = fromPath + "/**/*.{md,mdx}";
    const ignore = ignorePath + "/**";

    consola.info(`Replacing ${name} tag references in: ${files}`);

    const tags = Object.keys(source).map((tag) => new RegExp(escapeRegex(tag), "g"));
    const results = [];

    try {
        const options = {
            dry,
            files,
            ignore,
            from: tags,
            to: (tag: string, position: number, fileContent: string, fileName: string) => {
                const before = fileContent[position - 1];
                const after = fileContent[position + tag.length];

                const reference = source[tag];
                // TODO update reference if it has changed since last time

                // If tag was already processed, skip it
                if (before === openBracket || after === closeBracket) return tag;

                const result = `[${tag}](${prefix}${reference})`;
                const word = fileContent.substr(position - 1, tag.length + 2);

                const entry = {
                    tag,
                    reference,
                    before,
                    after,
                    result,
                    word,
                    fileName,
                };

                results.push(entry);

                return result;
            },
        };
        await replace(options);
        dry && console.log(results);
        consola.success(`Done replacing ${results.length} ${name} references`);
        return results;
    } catch (error) {
        consola.error(`Error while replacing ${name} references`, error);
    }
}
