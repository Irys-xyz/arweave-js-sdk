// // I apologise in advance.
import NodeBundlr from "../build/cjs/node/index";
import type WB from "../build/esm/web/webIndex";
// @ts-ignore
declare const module: { exports: { WebBundlr: WB } };
export class IndexBundlr extends NodeBundlr {
  // static WebBundlr = WB;
  static get WebBundlr(): WB {
    // @ts-ignore
    return require("../build/esm/web/webIndex").default;
  }
}
// @ts-ignore
export = IndexBundlr;
module.exports = IndexBundlr;
export type WebBundlr = typeof WB;
// @ts-ignore
export default IndexBundlr;
