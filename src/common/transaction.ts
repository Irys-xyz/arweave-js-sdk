import { Bundlr } from "./bundlr";
import Crypto from "crypto";
import { UploadResponse } from "./types";
import { createData, DataItem, DataItemCreateOptions, isBrowser, Signer } from "./signing";


/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */
export class BundlrTransaction extends DataItem {
    private bundlr: Bundlr;
    private signer: Signer;

    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions) {
        super(createData(data, bundlr.currencyConfig.getSigner(), {
            //@ts-ignore
            ...opts, anchor: opts?.anchor ?? (isBrowser() ? crypto.getRandomValues(Buffer.alloc(32)) : Crypto.randomBytes(32)).toString("base64").slice(0, 32)
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

    async upload(): Promise<UploadResponse> {
        return (await this.bundlr.uploader.uploadTransaction(this)).data;
    }

}