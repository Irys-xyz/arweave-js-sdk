import NodeBundlr from "./node/index";
import WebBundlr from "./web/index";

// this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebBundlr imports.
class IndexBundlr extends NodeBundlr {
  static default = IndexBundlr;
  static NodeBundlr = WebBundlr;
  static WebBundlr = WebBundlr;
}
export = IndexBundlr;
