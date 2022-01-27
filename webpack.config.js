const path = require('path');
const webpack = require("webpack");

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
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            process: "process/browser",
            crypto: "crypto-browserify",
            stream: "stream-browserify"
        },
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "assert": require.resolve("assert/"),
            "stream": require.resolve("stream-browserify"),
            "process": require.resolve("process/browser"),
            "util": require.resolve("util"),
            "events": require.resolve("events/")
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser'
        }),
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build/web'),
    },
};
