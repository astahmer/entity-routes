const tagsByReferences = {
    "/entity-routes/route-scope/": ["`route scope`", "`route scopes`"],
    "/entity-routes/operations/": ["**operations**"],
    "/entity-routes/groups/": ["**groups**"],
    "http://typeorm.io/": ["`TypeORM`"],
    "https://typeorm.io/#/one-to-one-relations": ["`OneToOne`"],
    "https://typeorm.io/#/many-to-one-one-to-many-relations": ["`OneToMany`", "`ManyToOne`"],
    "https://typeorm.io/#/many-to-many-relations": ["`ManyToMany`"],
};

/** Escape a string to be used for a RegExp
 * @see https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711 */
function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

type CustomDocRef = Record<string, string[]>;
function inverseReferences(refs: CustomDocRef): Record<string, string> {
    return Object.entries(refs).reduce(
        (acc, [url, tags]) => ({
            ...acc,
            ...tags.reduce((tagsAcc, string) => ({ ...tagsAcc, [escapeRegex(string)]: url }), {}),
        }),
        {}
    );
}

export default inverseReferences(tagsByReferences);
