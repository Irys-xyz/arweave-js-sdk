import "./common/hack.js";
import NodeIrys from "./node/index";
import WebIrys from "./web/index";

// this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebIrys imports.
class IndexIrys extends NodeIrys {
  static default = IndexIrys;
  static NodeIrys = NodeIrys;
  static WebIrys = WebIrys;
}
export = IndexIrys;
