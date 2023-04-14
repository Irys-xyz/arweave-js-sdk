import NB from "./node/index.js";
import WB from "./web/index.js";

// this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebBundlr imports.
class IndexBundlr extends NB {
  static NodeBundlr = NB;
  static WebBundlr = WB;
}
export = IndexBundlr;
