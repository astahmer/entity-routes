const pkg = require("./package.json");
const shell = require("shelljs");

const deps = Object.keys(pkg.dependencies);
const depsString = deps.join(",");

shell.exec("rimraf ./dist && microbundle --target node --external " + depsString + " && npm run tscpaths");
console.log(`Automatically set dependencies as external: ${depsString}`);
