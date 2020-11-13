const remarkMdxMetadata = require("remark-mdx-metadata");
const makeToc = require("markdown-toc");

function addMdxMeta() {
    return (tree, vfile) => {
        const tableOfContents = makeToc(vfile.contents).json;
        remarkMdxMetadata({ meta: { tableOfContents, ...vfile.data } })(tree);
    };
}

module.exports = addMdxMeta;
