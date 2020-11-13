const compose = require("compose-function");

const withImages = require("next-images");
const withDoc = require("./plugin");

const composed = compose(withImages, withDoc);

module.exports = composed();
