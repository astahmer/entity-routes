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
const toTagRef = ({ name, kindString, signatures, flags }) => [
    "`" + getTagRefName({ name, kindString, signatures }) + "`",
    getDocTagRef({ name, kindString, flags }),
];

/** Filter to return only items with valid ref */
const withRef = ([tag, ref]) => ref;

/** Recursively get tag ref from item & item.children  */
export function getDocItemTagRefs(root) {
    return root.children.reduce(
        (acc, item) => acc.concat([toTagRef(item)].filter(withRef), item.children ? getDocItemTagRefs(item) : []),
        []
    );
}
