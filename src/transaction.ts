import { DataItem, DataItemCreateOptions, Signer } from "arbundles";
import arbundles from "arbundles"
import Bundlr from "./bundlr";

export default class BundlrTransaction {
    public dataItem: DataItem;
    private bundlr: Bundlr;
    private signer: Signer;

    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions) {
        this.bundlr = bundlr;
        this.signer = this.bundlr.currencyConfig.getSigner()
        this.dataItem = arbundles.createData(data, this.signer, opts)
    }

    public async sign(): Promise<void> {
        this.dataItem.sign(this.signer)
    }
    public async upload(): Promise<void> {
        this.bundlr.currencyConfig.sendTx(this.dataItem)
    }

}