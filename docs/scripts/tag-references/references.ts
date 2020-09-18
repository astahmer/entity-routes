const tagsByReferences = require("../../tag-references.json");

type CustomDocRef = Record<string, string[]>;
function inverseReferences(refs: CustomDocRef): Record<string, string> {
    return Object.entries(refs).reduce(
        (acc, [url, tags]) => ({
            ...acc,
            ...tags.reduce((tagsAcc, string) => ({ ...tagsAcc, [string]: url }), {}),
        }),
        {}
    );
}

export const references = inverseReferences(tagsByReferences);
