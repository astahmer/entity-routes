import path from "path";
import { replaceTypedocLinks } from "./replaceTypedocLinks";
import { getDocItemTagRefs, replaceTagReferences, references } from "./tag-references";

const pkg = require("../package.json");

const pageDir = "./src/pages";
const generatedDocsDir = pkg.directories.typedoc;
const prefix = `/${path.basename(path.resolve(pkg.directories.typedoc))}`;

const typeDocsReflections = require("../docs.json");
const typeDocRefs = Object.fromEntries(getDocItemTagRefs(typeDocsReflections));

const fromPath = pageDir;
const ignorePath = generatedDocsDir;

const args = process.argv.slice(2);
const dry = args[0] === "--dry";

async function run() {
    await replaceTypedocLinks({ fromPath: generatedDocsDir, prefix });
    await replaceTagReferences({
        name: "Typedoc Definitions",
        source: typeDocRefs,
        fromPath,
        ignorePath,
        prefix: prefix + "/",
        dry,
    });
    await replaceTagReferences({ name: "custom", source: references, fromPath, ignorePath, dry });
}

export default run();
