const tagsByReferences = {
    "/route-scope/": ["`route scope`"],
    "http://typeorm.io/": ["TypeORM"],
};

const inverseReferences = (refs) =>
    Object.entries(refs).reduce(
        (acc, [url, tags]) => ({ ...acc, ...tags.reduce((tagsAcc, string) => ({ ...tagsAcc, [string]: url }), {}) }),
        {}
    );

const referencesByTags = inverseReferences(tagsByReferences);

module.exports = referencesByTags;
