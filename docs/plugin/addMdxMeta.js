const remarkMdxMetadata = require("remark-mdx-metadata");
const makeToc = require("markdown-toc");

const mdRegex = /(?:__|[*#])|\[(.*?)\]\(.*?\)/gm;

function addMdxMeta() {
    return (tree, vfile) => {
        const toc = makeToc(vfile.contents).json;
        // Strip markdown links from toc item content
        const tableOfContents = toc.map((item) => ({ ...item, title: item.content.replace(mdRegex, "$1") }));
        remarkMdxMetadata({ meta: { tableOfContents, ...vfile.data } })(tree);
    };
}

module.exports = addMdxMeta;
