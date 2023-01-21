const path = require('path');
const webpack = require("webpack");
const { DuplicatesPlugin } = require("inspectpack/plugin");

module.exports = {
    entry: './src/web/bundlr.ts',
    devtool: 'source-map',
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: [
                    /node_modules/,
                    path.resolve(__dirname, "src/node/"),
                    path.resolve(__dirname, "build/")
                ],
            },
        ],
    },
    resolve: {
        symlinks: false,
        extensions: ['.ts', '.js'],
        alias: {
            process: "process/browser",
            crypto: "crypto-browserify",
            stream: "stream-browserify",
        },
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "assert": require.resolve("assert/"),
            "stream": require.resolve("stream-browserify"),
            "process": require.resolve("process/browser"),
            "util": require.resolve("util"),
            "events": require.resolve("events/"),
            "buffer": require.resolve('buffer/'),
            "zlib": require.resolve("browserify-zlib"),
            "path": require.resolve("path-browserify")
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        }),
        new DuplicatesPlugin({
            emitErrors: false,
            verbose: false
        })
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build/web'),
        libraryTarget: 'umd',
        library: 'Bundlr'
    },
};
