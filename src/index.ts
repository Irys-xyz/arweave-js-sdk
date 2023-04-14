import NB from "./node/index.js";
import WB from "./web/index.js";

// this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebBundlr imports.
export default class IndexBundlr extends NB {
  static default = IndexBundlr;
  static NodeBundlr = NB;
  static WebBundlr = WB;
}
// @ts-expect-error __importDefault is automatically injected by TSC for CJS environments. we don't want .default after all!
if (typeof __importDefault !== "undefined") {
  module.exports = IndexBundlr;
}
