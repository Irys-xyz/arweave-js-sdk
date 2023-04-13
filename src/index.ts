// // export { default } from "./node";
// // export { default as NodeBundlr } from "./node";
// import { NodeBundlr } from "./node";
// export = NodeBundlr;
// // I apologise in advance.
import NodeBundlr from "./node";
import WB from "./web";
// @ts-ignore
declare const module: { exports: { WebBundlr: typeof WB } };
export class IndexBundlr extends NodeBundlr {
  // static WebBundlr = WB;
  // static get WebBundlr(): WB {
  //   // @ts-ignore
  //   return require("./web").default;
  // }
  static WebBundlr = WB;
}
// @ts-ignore
export = IndexBundlr;
module.exports = IndexBundlr;
export type WebBundlr = typeof WB;
// @ts-ignore
export default IndexBundlr;
