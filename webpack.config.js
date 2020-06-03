const webpack = require("webpack");
const path = require("path");

const nodeExternals = require("webpack-node-externals");
const { loader } = require("webpack-loader-helper");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// Resolves tsConfig path aliases
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
// Replace tsConfig path aliases with relatives path for .d.ts
const tsTransformPaths = require("@zerollup/ts-transform-paths");

const pkg = require("./package.json");
const tsConfig = require("./tsconfig.json");

const outDirName = tsConfig.compilerOptions.outDir.replace("./", "");
const pollInterval = 500;

module.exports = (env) => {
    const mode = env.prod ? "production" : "development";
    const isDev = mode === "development";
    const withHMR = isDev && env.hmr;

    return {
        mode,
        entry: withHMR ? [`webpack/hot/poll?${pollInterval}`, pkg.source] : { index: pkg.source },
        watch: isDev,
        watchOptions: {
            aggregateTimeout: 1000,
            poll: pollInterval,
        },
        target: "node",
        devtool: withHMR ? "inline-cheap-module-source-map" : "source-map",
        externals: [
            nodeExternals({
                whitelist: [`webpack/hot/poll?${pollInterval}`, "@astahmer/class-validator"],
            }),
        ],
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
            plugins: [new TsconfigPathsPlugin()],
        },
        plugins: [new webpack.EnvironmentPlugin({ NODE_ENV: mode }), new CleanWebpackPlugin()].concat(
            withHMR ? [new webpack.HotModuleReplacementPlugin()] : []
        ),
        cache: true,
        module: {
            rules: [
                {
                    test: /.tsx?$/,
                    exclude: ["/node_modules", "/tests"],
                    use: [
                        loader("ts", {
                            transpileOnly: withHMR,
                            getCustomTransformers: (program) => {
                                const transformer = tsTransformPaths(program);

                                return {
                                    before: [transformer.before], // for updating paths in generated code
                                    afterDeclarations: [transformer.afterDeclarations], // for updating paths in declaration files
                                };
                            },
                        }),
                    ],
                },
            ],
        },
        output: {
            path: path.join(__dirname, outDirName),
            filename: pkg.main.replace(outDirName, "."),
            library: pkg.name,
            libraryTarget: "umd",
            umdNamedDefine: true,
        },
        node: {
            __dirname: false,
            __filename: false,
        },
    };
};
