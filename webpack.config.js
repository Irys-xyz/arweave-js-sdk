const path = require('path');
// const webpack = require("webpack");

module.exports = {
    entry: './src/web/index.ts',
    devtool: 'source-map',
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: path.resolve("./esm.tsconfig.json")
                    }
                }],
                exclude: [
                    /node_modules/,
                    path.resolve(__dirname, "src/node/"),
                    path.resolve(__dirname, "build/")
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        // alias: {
        //     process: "process/browser",
        //     crypto: "crypto-browserify",
        //     stream: "stream-browserify",
        // },
        // fallback: {
        //     "crypto": require.resolve("crypto-browserify"),
        //     "assert": require.resolve("assert/"),
        //     "stream": require.resolve("stream-browserify"),
        //     "process": require.resolve("process/browser"),

        //     "events": require.resolve("events/"),
        //     "buffer": require.resolve('buffer/'),
        //     "zlib": require.resolve("browserify-zlib"),
        //     "path": require.resolve("path-browserify")
        // }
        fallback: {
            crypto: false,
            stream: false,
            buffer: false,
            path: false,
            zlib: false,
            // "util": require.resolve("util"),
        },
    },
    plugins: [
        // new webpack.ProvidePlugin({
        //     process: 'process/browser',
        //     Buffer: ['buffer', 'Buffer']
        // }),
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
        library: {
            type: "umd",
            name: "Bundlr"
        }
    }
};
