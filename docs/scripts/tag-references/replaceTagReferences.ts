import consola from "consola";
import { ReplaceInFileConfig, replaceInFile } from "replace-in-file";

import { escapeRegex } from "../helpers";

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
    const results: TagReplaceResult[] = [];

    try {
        const options = {
            dry,
            files,
            ignore,
            from: tags,
            to: (tag: string, position: number, fileContent: string, fileName: string) => {
                const before = fileContent[position - 1];
                const after = fileContent[position + tag.length];
                // If tag was already processed, skip it
                if (before === openBracket || after === closeBracket) return tag;

                const prevOpenBracket = getNextCharIndex({
                    char: openBracket,
                    str: fileContent,
                    direction: "prev",
                    start: position,
                });
                const prevCloseBracket = getNextCharIndex({
                    char: closeBracket,
                    str: fileContent,
                    direction: "prev",
                    start: position,
                });

                // Prevent adding tag reference on handwritten link using tag
                // ex: [More on that `tag`](/reference-link)
                // `tag` would match and witout below condition would be wrapped to
                // [More on that [`tag`](/rereference)](/handwritten-link)
                if (prevOpenBracket > prevCloseBracket) return tag;

                const reference = source[tag];
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
        await replaceInFile((options as unknown) as ReplaceInFileConfig);
        dry && console.log(results);
        consola.success(`Done replacing ${results.length} ${name} references`);
        return results;
    } catch (error) {
        consola.error(`Error while replacing ${name} references`, error);
    }
}

export type TagReplaceResult = {
    tag: string;
    fileName: string;
    reference: string;
    result: string;
    before?: string;
    after?: string;
    word?: string;
};

type GetNextCharIndexArgs = { char: string; str: string; start: number; direction: "prev" | "next" };
function getNextCharIndex({ char, str, start, direction = "next" }: GetNextCharIndexArgs) {
    let currentIndex = start;
    let currentChar = str[currentIndex];

    while (currentChar !== char) {
        currentChar = str[direction === "next" ? ++currentIndex : --currentIndex];
        if (currentIndex === 0) break;
    }

    return currentIndex;
}
