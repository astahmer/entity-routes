const path = require("path");
const { promises } = require("fs");

const chokidar = require("chokidar");
const throttle = require("lodash/throttle");

const { EXTENSIONS_TO_WATCH, sidebarFile } = require("./config");
const getMdxFilesTree = require("./getMdxFilesTree");

const makeSidebar = throttle(async () => {
    try {
        await promises.writeFile(sidebarFile, JSON.stringify(getMdxFilesTree(), null, 4));
        console.log(`[DOC] generated ${sidebarFile}`);
    } catch (e) {
        console.error(`could not write ${sidebarFile}`);
        console.error(e);
    }
}, 2000);

function onFileChange(name) {
    const ext = path.extname(name);
    if (!EXTENSIONS_TO_WATCH.includes(ext)) return;

    makeSidebar();
}

function makeWatcher() {
    console.log(`[DOC] watching ./**/*.{mdx} on add|unlink|change...`);
    const watcher = chokidar.watch("./**/*.{md,mdx}", {
        persistent: true,
        ignoreInitial: true,
    });
    watcher.on("add", onFileChange);
    watcher.on("unlink", onFileChange);
    watcher.on("change", onFileChange);
}

module.exports = { makeWatcher, makeSidebar };
