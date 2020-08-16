const pkg = require("./package.json");
const destDir = pkg.scripts["docs:clean"].split("rimraf ")[1];

module.exports = {
    mode: "library",
    theme: "docusaurus2",
    tsconfig: "../tsconfig.json",
    out: destDir,
};
