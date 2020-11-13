const { readFileSync } = require("fs");
const path = require("path");

const dirTree = require("directory-tree");
const getFrontMatter = require("front-matter");

const { pagesPath } = require("./config");
const { formatRelativePath } = require("./helpers");

module.exports = function getMdxFilesTree() {
    return dirTree(pagesPath, { normalizePath: true, extensions: /\.mdx?/ }, (node) => {
        const pathName = node.path;
        const content = readFileSync(pathName).toString();
        const data = getFrontMatter(content);

        node.meta = data.attributes;
        node.url = formatRelativePath(path.relative(pagesPath, pathName));

        delete node.extension;
        delete node.size;
        delete node.type;
    });
};
