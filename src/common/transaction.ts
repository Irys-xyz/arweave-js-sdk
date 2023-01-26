import { createData, DataItem, DataItemCreateOptions } from "arbundles";
import { Signer } from "arbundles/src/signing";
import Bundlr from "./bundlr";
import Crypto from "crypto";
import { UploadOptions, UploadReceipt, UploadResponse } from "./types";

/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */
export default class BundlrTransaction extends DataItem {
    private bundlr: Bundlr;
    private signer: Signer;

    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions & { dataIsRawTransaction?: boolean; }) {
        super(opts?.dataIsRawTransaction === true ? Buffer.from(data) : createData(data, bundlr.currencyConfig.getSigner(), {
            ...opts, anchor: opts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32)
        }).getRaw());
        this.bundlr = bundlr;
        this.signer = bundlr.currencyConfig.getSigner();
    }

    public sign(): Promise<Buffer> {
        return super.sign(this.signer);
    }

    get size(): number {
        return this.getRaw().length;
    }

    async upload(opts?: UploadOptions): Promise<UploadResponse | UploadReceipt> {
        return (await this.bundlr.uploader.uploadTransaction(this, opts)).data;
    }

    static fromRaw(rawTransaction: Buffer, bundlrInstance: Bundlr): BundlrTransaction {
        return new BundlrTransaction(rawTransaction, bundlrInstance, { dataIsRawTransaction: true });
    }
}