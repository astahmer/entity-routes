const replace = require("replace-in-file");
const consola = require("consola");

const [openBracket, closeBracket] = ["[", "]"];

/** Replace tags from given source by its reference */
export async function replaceTagReferences({
    fromPath,
    ignorePath,
    source,
    prefix = "",
    dry,
}: {
    fromPath: string;
    ignorePath?: string;
    source: Record<string, string>;
    prefix?: string;
    dry?: boolean;
}) {
    const files = fromPath + "/**/*.{md,mdx}";
    const ignore = ignorePath + "/**";

    consola.info(`Starting to replace tag references in handwritten files in: ${files}`);
    consola.info(`Ignoring files in: ${ignore}`);

    const tags = Object.keys(source).map((tag) => new RegExp(tag, "g"));
    const results = [];

    try {
        const options = {
            dry,
            files,
            ignore,
            from: tags,
            to: (tag, position, fileContent, fileName) => {
                const before = fileContent[position - 1];
                const after = fileContent[position + tag.length];

                const reference = source[tag];
                // If tag was already processed, skip it
                if (before === openBracket || after === closeBracket) return tag;

                const result = `[${tag}](${prefix}${reference})`;
                const word = fileContent.substr(position - 1, tag.length + 2);

                results.push({
                    tag,
                    reference,
                    before,
                    after,
                    result,
                    word,
                    fileName,
                });

                return result;
            },
        };
        await replace(options);
        console.log(results);
        consola.success(`Done replacing ${results.length} references`);
        return results;
    } catch (error) {
        consola.error("Error while replacing references", error);
    }
}
