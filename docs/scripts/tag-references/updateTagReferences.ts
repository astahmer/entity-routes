import consola from "consola";
import { ReplaceInFileConfig, replaceInFile } from "replace-in-file";

import { escapeRegex } from "../helpers";
import { ReplaceTagReferencesArgs, TagReplaceResult } from "./replaceTagReferences";

export type UpdateTagReferencesArgs = ReplaceTagReferencesArgs & { ignoreSource: string[] };
/** Update written tag references with those from current config in case there is a diff */
export async function updateTagReferences({
    fromPath,
    ignorePath,
    source,
    ignoreSource,
    prefix = "",
    name,
    dry,
}: UpdateTagReferencesArgs) {
    const files = fromPath + "/**/*.{md,mdx}";
    const ignore = ignorePath + "/**";

    consola.info(`Updating ${name} tag references in: ${files}`);

    // Match every [`tag`](anyLink)
    const tagReferences = Object.keys(source).map((tag) => new RegExp(`\\[${escapeRegex(tag)}\\]\\([^)]+\\)`, "g"));
    const results: TagReplaceResult[] = [];

    try {
        const options = {
            dry,
            files,
            ignore,
            from: tagReferences,
            to: (current: string, _position: number, _fileContent: string, fileName: string) => {
                const tag = current.substring(1, current.indexOf("]"));
                const currentReference = current.substring(3 + tag.length, current.indexOf(")"));
                const reference = source[tag];
                const result = `[${tag}](${prefix}${reference})`;

                if (current === result || !currentReference.startsWith(prefix) || ignoreSource.includes(result)) {
                    return current;
                }

                const entry = {
                    tag,
                    reference,
                    current,
                    result,
                    fileName,
                };

                results.push(entry);

                return result;
            },
        };
        await replaceInFile((options as unknown) as ReplaceInFileConfig);
        dry && console.log(results);
        consola.success(`Done updating ${results.length} ${name} references`);
        return results;
    } catch (error) {
        consola.error(`Error while updating ${name} references`, error);
    }
}
