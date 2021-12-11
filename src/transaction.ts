import { DataItem, DataItemCreateOptions } from "arbundles";
import arbundles from "arbundles"
import Bundlr from "./bundlr";
import { Signer } from "arbundles/src/signing";

export default class BundlrTransaction {
    public dataItem: DataItem;
    private bundlr: Bundlr;
    private signer: Signer;

    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions) {
        this.bundlr = bundlr;
        this.signer = this.bundlr.currencyConfig.getSigner()
        this.dataItem = arbundles.createData(data, this.signer, opts)
    }

    public async sign() {
        this.dataItem.sign(this.signer)
    }
    public async upload() {
        this.bundlr.currencyConfig.sendTx(this.dataItem)
    }

}