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
    externals: {
        ...base.externals,
        "arbundles": "arbundles",
    },
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
    externals: {
        ...base.externals,
        "arbundles": "arbundles",
    },
    output: {
        filename: "umd.bundle.js",
        path: path.resolve(__dirname, "esm/web"),
        library: "BundlrNearWeb",
        libraryTarget: "umd",
        globalObject: "globalThis",
        umdNamedDefine: true,
    }
}
const aio = {
    ...base,
    output: {
        filename: "aio.bundle.js",
        path: path.resolve(__dirname, "esm/web"),
        libraryTarget: "module",
        umdNamedDefine: true
    },
    resolve: {
        ...base.resolve,
        fallback: {
            "zlib": false,
            "path": false
        }
    },
    experiments: {
        outputModule: true,
    }
}

module.exports = [mod, umd, aio]