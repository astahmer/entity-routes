const tagsByReferences = {
    "/entity-routes/introduction#maker/": ["`maker`", "`makers`"],
    "/entity-routes/route-scope/": ["`route scope`", "`route scopes`"],
    "/entity-routes/operations/": ["**operation**", "**operations**"],
    "/entity-routes/groups/": ["**groups**"],
    "/entity-routes/subresources/": ["**subresources**"],
    "/entity-routes/filters/": ["**filters**"],
    "/entity-routes/hooks/": ["**hooks**"],
    "http://typeorm.io/": ["`TypeORM`"],
    "https://typeorm.io/#/entities": ["`entities`, `entities`, `@Entity`"],
    "https://typeorm.io/#/one-to-one-relations": ["`OneToOne`"],
    "https://typeorm.io/#/many-to-one-one-to-many-relations": ["`OneToMany`", "`ManyToOne`"],
    "https://typeorm.io/#/many-to-many-relations": ["`ManyToMany`"],
};

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
