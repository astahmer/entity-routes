import path from "path";

import { replaceTypedocLinks } from "./replaceTypedocLinks";
import { ReplaceTagReferencesArgs, getDocItemTagRefs, references, replaceTagReferences } from "./tag-references";
import { updateTagReferences } from "./tag-references/updateTagReferences";

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

const typeDocArgs = {
    name: "Typedoc Definitions",
    source: typeDocRefs,
    fromPath,
    ignorePath,
    prefix,
    dry,
};

const { exec } = require("child_process");

async function run() {
    await replaceTypedocLinks({ fromPath: generatedDocsDir, prefix });
    await replaceTagReferences(typeDocArgs);
    await replaceTagReferences({ name: "custom", source: references, fromPath, ignorePath, dry });
    await updateTagReferences({
        ...typeDocArgs,
        ignoreSource: Object.entries(references).map(([tag, ref]) => `[\`${tag}\`](${typeDocArgs.prefix}${ref})`),
    });
    exec("npm run prettier");
}

export default run();
