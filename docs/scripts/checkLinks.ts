import path from "path";
import { promisify } from "util";

import consola from "consola";
import { readFile } from "fs/promises";
import mdLinkCheckerCb from "markdown-link-check";
import { glob } from "smart-glob";

const reader = (path: string) => readFile(path, { encoding: "utf-8" });

type LinkCheckResult = { link: string; status: "alive" | "ignored" | "dead"; statusCode: number; err: string };
type LinkChecker = (content: string, options: Record<string, any>) => Promise<LinkCheckResult[]>;
const mdLinkChecker = promisify(mdLinkCheckerCb) as LinkChecker;

const checkerDefaults = { baseUrl: "http://localhost:3000", ignorePatterns: [{ pattern: /definitions/ }] };
const checker = (content: string) => mdLinkChecker(content, checkerDefaults);

function getMdxPages() {
    return glob(path.resolve("./src/pages/**/*.{md,mdx}"), {
        gitignore: true, // add the ignore from the .gitignore in current path
        ignore: ["node_modules", "definitions"],
    });
}

async function checkLinks({ withSummary }: { withSummary?: boolean } = {}) {
    consola.log("Checking links in md/mdx pages...");

    const mdxPages = await getMdxPages();
    consola.info(`Found ${mdxPages.length} pages.`);

    const mdxContent = await Promise.all(mdxPages.map(reader));
    const pairs = mdxPages.map((path, i) => [path, mdxContent[i]]);

    const deadResults = await Promise.all(pairs.map(checkLinksForMdxContent));
    const deads = deadResults.filter(Boolean);
    consola.success(`Done checking links for every pages.`);

    if (withSummary && deads.length) {
        consola.log("Here is a summary of all dead links");
        console.dir(deads, { depth: null });
    }
}

async function checkLinksForMdxContent([path, content]: [string, string]) {
    try {
        const results = await checker(content);
        const deads = results.filter((result) => result.status === "dead");

        if (deads.length) {
            const plural = deads.length > 1;
            consola.warn(`There ${plural ? "are" : "is"} ${deads.length} dead link${plural ? "s" : ""} in ${path}`);
            deads.length && consola.log(deads.map((result) => `[${result.statusCode}]: ${result.link}`));

            return [path, deads] as const;
        }
    } catch (err) {
        consola.error(`There was an error while checking links in ${path}`);
        consola.error(err);
    }
}

checkLinks();
