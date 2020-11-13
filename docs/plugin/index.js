const path = require("path");

const remarkSlug = require("remark-slug");
const addMdxMeta = require("./addMdxMeta");

const withMdxEnhanced = require("next-mdx-enhanced");
const withMDX = withMdxEnhanced({ fileExtensions: ["mdx", "md"], remarkPlugins: [remarkSlug, addMdxMeta] });

const { pageExtensions } = require("./config");
const { makeWatcher, makeSidebar } = require("./makeSidebar");
// TODO remarkPlugin for TagRef ?

// TODO ts with script "compile": "tsc --incremental && tsc --module ESNext --outDir esm --incremental",
module.exports = function withDoc(nextConfig = {}) {
    return withMDX({
        ...nextConfig,
        pageExtensions,
        webpack: (config, options) => {
            config.resolve.alias["__NEXT_ROOT__"] = path.join(process.cwd());
            config.resolve.alias["nextjs_root_folder_"] = path.join(process.cwd()); // TODO rm

            if (options.isServer) return config; // only run once
            if (nextConfig.webpack && typeof nextConfig.webpack === "function") {
                nextConfig.webpack(config, options);
            }

            makeSidebar();

            if (process.env.NODE_ENV !== "production") {
                makeWatcher();
            }

            return config;
        },
    });
};
