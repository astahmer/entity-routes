const { pageExtensions } = require("./config");

// Reverse so that mdx/tsx/jsx come before md/ts/js
const pageExtensionsRegex = new RegExp(
    pageExtensions
        .map((ext) => "." + ext)
        .reverse()
        .join("|"),
    "gi"
);

function formatRelativePath(path) {
    let relativePath = path.replace(pageExtensionsRegex, "").replace(/\bindex$/, "");

    return "/" + (relativePath || "");
}

module.exports = {
    formatRelativePath,
};
