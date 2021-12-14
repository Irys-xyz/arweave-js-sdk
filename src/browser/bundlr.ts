import Bundlr from "../common/bundlr";

export default class WebBundlr extends Bundlr {
    constructor(url: string, currency: string, wallet?: any) {
        super(url, currency, wallet);
    }
}
