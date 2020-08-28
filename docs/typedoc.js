const pkg = require("./package.json");
const destDir = pkg.directories.typedoc;

module.exports = {
    mode: "library",
    theme: "docusaurus2",
    tsconfig: "../tsconfig.json",
    out: destDir,
    readme: "none",
    hideBreadcrumbs: false,
    skipSidebar: true,
    json: "./docs.json",
};
