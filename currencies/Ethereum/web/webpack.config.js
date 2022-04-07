const path = require('path');
const webpack = require("webpack");
const { DuplicatesPlugin } = require("inspectpack/plugin");

module.exports = {
    entry: './index.ts',
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
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
        "@bundlr-network/client": "@bundlr-network/client",
        "arbundles": "arbundles"
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            process: "process/browser",
            crypto: "crypto-browserify",
            stream: "stream-browserify",
        },
        fallback: {
            "crypto": false,
            "assert": false,
            "stream": false,
            "process": false,
            "util": false,
            "events": false,
            "buffer": false,
            "zlib": false,
            "path": false,
        }
    },
    plugins: [

        new DuplicatesPlugin({
            emitErrors: false,
            verbose: false
        })
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'esm/web'),
        libraryTarget: 'module',
        umdNamedDefine: true
    },
    experiments: {
        outputModule: true,
    }
}; 