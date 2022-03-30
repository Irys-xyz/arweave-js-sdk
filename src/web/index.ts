/* eslint-disable @typescript-eslint/ban-ts-comment */
import *  as util from "util"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
globalThis.util ??= util;

// // shim for loading in NodeJS deps
// import * as buffer from "buffer/";
// import * as crypto from "crypto-browserify";

// import * as stream from "stream-browserify";
// import * as path from "path-browserify";
// /** @ts-ignore */
// globalThis.Buffer ??= buffer.default.Buffer;
// globalThis.Crypto ??= crypto;
// globalThis.process ??= { env: {} };
// globalThis.stream ??= stream;
// globalThis.path ??= path;
// /** @ts-ignore */

export { default } from "./bundlr"
export { default as WebBundlr } from "./bundlr"

// export * from "./currencies/index"