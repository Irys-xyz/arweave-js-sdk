import NodeBundlr from "./node/index";
import WebBundlr from "./web/index";
export default NodeBundlr;
export { default as WebBundlr } from "./web/index";
export { default as NodeBundlr } from "./node/index";

// @ts-expect-error __importDefault is automatically injected by TSC for CJS environments. we don't want .default after all!
if (typeof __importDefault !== "undefined") {
  // this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebBundlr imports.
  class IndexBundlr extends NodeBundlr {
    static default = IndexBundlr;
    static NodeBundlr = WebBundlr;
    static WebBundlr = WebBundlr;
  }
  module.exports = IndexBundlr;
}
