const path = require("path");
const webpack = require("webpack");
const { DuplicatesPlugin } = require("inspectpack/plugin");
// const ForkTsCheckerNotifierWebpackPlugin = require("fork-ts-checker-notifier-webpack-plugin");
// const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  entry: "./build/esm/web/bundlr.js",
  devtool: "source-map",
  mode: "production",
  // module: {
  //   rules: [
  //     {
  //       test: /\.ts$/,
  //       use: { loader: "ts-loader", options: { configFile: "web.tsconfig.json" } },
  //       exclude: [/node_modules/, path.resolve(__dirname, "src/node/"), path.resolve(__dirname, "build/")],
  //     },
  //   ],
  // },
  resolve: {
    symlinks: false,
    extensions: [".ts", ".js"],
    alias: {
      process: "process/browser",
      crypto: "crypto-browserify",
      stream: "stream-browserify",
      // "$/utils": path.resolve(__dirname, "./src/web/utils.ts"),
    },
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      events: require.resolve("events/"),
      buffer: require.resolve("buffer/"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
    new DuplicatesPlugin({
      emitErrors: false,
      verbose: true,
    }),
    // new ForkTsCheckerWebpackPlugin(),
    // new ForkTsCheckerNotifierWebpackPlugin({
    //   title: "TypeScript",
    //   excludeWarnings: false,
    // }),
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
    libraryTarget: "umd",
    library: "Bundlr",
  },
};
