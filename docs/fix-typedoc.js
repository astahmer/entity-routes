const replace = require("replace-in-file");
const consola = require("consola");

const pageDir = "./src/pages";
const generatedDocsDir = pageDir + "/api-reference";

const tagReferences = require("./tag-references");

const typeDocs = require("./docs.json");
const urlByCategories = {
    Enumeration: "enums/",
    Class: "classses/",
    Interface: "interfaces/",
    "Type alias": "globals#",
    Function: "globals#",
    Variable: "globals#const-",
    "Object literal": "globals#const-",
};

const shouldBeConstKind = ["Variable", "Object literal"];
/** Returns false if doc item should not be included as tag ref */
const validateTagRef = ({ kindString, flags }) =>
    urlByCategories[kindString] && (shouldBeConstKind.includes(kindString) ? flags?.isConst : true);

/** Get doc item as tag ref */
const getDocTagRef = ({ name, kindString, flags }) =>
    validateTagRef({ kindString, flags }) && urlByCategories[kindString] + name.toLowerCase();

/** Return reference name unless it's a decorator then prepend a @ */
const getTagRefName = ({ name, kindString, signatures }) =>
    kindString === "Function" && signatures?.find((item) => item.type?.name?.endsWith("Decorator")) ? "@" + name : name;

/** Make a tuple of [tag/ref] from a doc item */
const toTagRef = ({ name, kindString, signatures }) => [
    "`" + getTagRefName({ name, kindString, signatures }) + "`",
    getDocTagRef({ name, kindString }),
];

/** Filter to return only items with valid ref */
const withRef = ([tag, ref]) => ref;

/** Recursively get tag ref from item & item.children  */
function getDocItemTagRefs(root) {
    return root.children.reduce(
        (acc, item) => acc.concat([toTagRef(item)].filter(withRef), item.children ? getDocItemTagRefs(item) : []),
        []
    );
}

const docsTagRefs = Object.fromEntries(getDocItemTagRefs(typeDocs));
// consola.info(docsTagRefs);

(async function run() {
    // replaceMarkdownLinks();
    replaceTagReferences(docsTagRefs);
    // replaceTagReferences(tagReferences);
})();

async function replaceMarkdownLinks() {
    consola.info("Starting to replace links in Typedoc generated files");
    // Also fix "<>"" (by escaping it) which is used by COMPARISON_OPERATOR and would cause MDX to throw
    //  since it would be interpreted as a React jsx
    try {
        const options = {
            files: generatedDocsDir + "/**",
            from: [/\.md/g, `"<>"`],
            to: ["", `"<\\>"`],
        };
        await replace(options);
        consola.success("Done replacing links");
    } catch (error) {
        consola.error("Error while replacing links", error);
    }
}

const [openBracket, closeBracket] = ["[", "]"];

/** Replace tags from given source by its reference */
async function replaceTagReferences(source) {
    const files = pageDir + "/**/*.{md,mdx}";
    const ignore = generatedDocsDir + "/**";

    consola.info(`Starting to replace tag references in handwritten files in: ${files}`);
    consola.info(`Ignoring files in: ${ignore}`);

    const tags = Object.keys(source).map((tag) => new RegExp(tag, "g"));
    // console.dir(tags, { maxArrayLength: 500 });
    // console.log(source);
    const results = [];
    try {
        const options = {
            dry: true,
            files,
            ignore,
            from: tags,
            to: (tag, position, fileContent, fileName) => {
                const before = fileContent[position - 1];
                const after = fileContent[position + tag.length];

                const reference = source[tag];
                // If tag was already processed, skip it
                if (before === openBracket || after === closeBracket) return tag;

                const result = `[${tag}](${reference})`;
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

                return tag;
                return result;
            },
        };
        await replace(options);
        consola.success("Done replacing references");
        return results;
    } catch (error) {
        consola.error("Error while replacing references", error);
    }
}

// TOOD Comparison page
// https://www.reddit.com/r/typescript/comments/icbey2/which_orm_should_i_use/
// https://www.prisma.io/

// TODO warn about heavy use of decorators
// no new weird schema files to get to know (prisma)
