import { exec } from "child_process";
import path from "path";

import typeDocsReflections from "../docs.json";
import pkg from "../package.json";
import { replaceTypedocLinks } from "./replaceTypedocLinks";
import { getDocItemTagRefs, references, replaceTagReferences } from "./tag-references";
import { updateTagReferences } from "./tag-references/updateTagReferences";

const pageDir = "./src/pages";
const generatedDocsDir = pkg.directories.typedoc;
const prefix = `/${path.basename(path.resolve(pkg.directories.typedoc))}`;

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
