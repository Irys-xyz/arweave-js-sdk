// I apologise in advance.
import NodeBundlr from "./node/bundlr";
import WB from "./web/bundlr";
// @ts-ignore
declare const module: { exports: { WebBundlr: typeof WB } };
export class IndexBundlr extends NodeBundlr {
  static WebBundlr = WB;
}
// @ts-ignore
export = IndexBundlr;
module.exports = IndexBundlr;
export type WebBundlr = typeof WB;
// @ts-ignore
export default IndexBundlr;
