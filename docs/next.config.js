const compose = require("compose-function");

const withImages = require("next-images");
const withDoc = require("./plugin");

const composed = compose(withImages, withDoc);

module.exports = composed({
    async rewrites() {
        return [
            {
                source: "/bee.js",
                destination: "https://cdn.splitbee.io/sb.js",
            },
            {
                source: "/_hive/:slug",
                destination: "https://hive.splitbee.io/:slug",
            },
        ];
    },
});
