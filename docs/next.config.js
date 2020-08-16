const compose = require("compose-function");
const { withDokz } = require("dokz/dist/plugin");
const emoji = require("remark-emoji");
const withImages = require("next-images");

const composed = compose(withImages, withDokz);

module.exports = composed({
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
    webpack: (config, options) => {
        let mdxLoader;
        config.module.rules.find((rule) => {
            if (rule.use && Array.isArray(rule.use))
                mdxLoader = rule.use.find((config) => config.loader === "@mdx-js/loader");
        });
        mdxLoader.options.remarkPlugins.push(emoji);
        return config;
    },
});
