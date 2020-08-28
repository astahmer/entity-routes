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

async function run() {
    return Promise.all([
        replaceTypedocLinks({ fromPath: generatedDocsDir, prefix }),
        replaceTagReferences({ source: typeDocRefs, fromPath, ignorePath, prefix: prefix + "/" }),
        replaceTagReferences({ source: references, fromPath, ignorePath }),
    ]);
}

export default run();
