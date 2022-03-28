import *  as util from "util"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
globalThis.util ??= util;
export { default } from "./bundlr"
export { default as WebBundlr } from "./bundlr"
export * from "./currencies/index"