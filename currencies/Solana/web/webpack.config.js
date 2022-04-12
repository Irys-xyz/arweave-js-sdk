const path = require("path");
const webpack = require("webpack");
const { DuplicatesPlugin } = require("inspectpack/plugin");

const base = {
    entry: "./index.ts",
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        configFile: path.resolve("./esm.json")
                    }
                }],
                exclude: [
                    /node_modules/,
                    path.resolve(__dirname, "esm/"),
                    path.resolve(__dirname, "cjs/")
                ],
            },
        ],
    },
    externals: {
        // "@bundlr-network/client": "BundlrClient",
        "arbundles": "arbundles",
        "Buffer": "Buffer",
        "crypto": "Crypto",
        "stream": "stream",
    },
    externalsType: "global",
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            // process: "process/browser",
            // crypto: "crypto-browserify",
            // stream: "stream-browserify",
        },
        fallback: {
            // "crypto": require.resolve("crypto-browserify"),
            // "assert": require.resolve("assert/"),
            // "stream": require.resolve("stream-browserify"),
            // "process": require.resolve("process/browser"),
            // "util": require.resolve("util"),
            // "events": require.resolve("events/"),
            // "buffer": require.resolve('buffer/'),
            // "zlib": require.resolve("browserify-zlib"),
            // "path": require.resolve("path-browserify")
            // "crypto": false,
            // "assert": false,
            // "stream": false,
            // "process": false,
            // "util": false,
            // "events": false,
            // "buffer": false,
            // "zlib": false,
            // "path": false,
        }
    },
    plugins: [
        // new webpack.ProvidePlugin({
        //     process: 'process/browser',
        //     Buffer: ['buffer', 'Buffer']
        // }),
        new DuplicatesPlugin({
            emitErrors: false,
            verbose: false
        })
    ],

};




const mod = {
    ...base,
    // externals: {
    //     ...base.externals,
    //     "@bundlr-network/client": "BundlrClient",
    //     // "arbundles": "arbundles"
    // },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "esm/web"),
        libraryTarget: "module",
        umdNamedDefine: true
    },
    experiments: {
        outputModule: true,
    }
}
const umd = {
    ...base,
    output: {
        filename: "umd.bundle.js",
        path: path.resolve(__dirname, "esm/web"),
        library: "BundlrSolanaWeb",
        libraryTarget: "umd",
        globalObject: "globalThis",
        umdNamedDefine: true,
    }
}

module.exports = [mod, umd]