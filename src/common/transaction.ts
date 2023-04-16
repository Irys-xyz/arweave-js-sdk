import type { Signer } from "arbundles";
import type Bundlr from "./bundlr";
import Crypto from "crypto";
import type {
  BundlrTransaction as IBundlrTransaction,
  BundlrTransactionCreateOptions,
  UploadOptions,
  UploadReceipt,
  UploadResponse,
  BundlrTransactonCtor,
} from "./types";

/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */

export default function buildBundlrTransaction(bundlr: Bundlr): BundlrTransactonCtor {
  class BundlrTransaction extends bundlr.arbundles.DataItem implements IBundlrTransaction {
    public bundlr: Bundlr;
    public signer: Signer;

    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: BundlrTransactionCreateOptions) {
      super(
        opts?.dataIsRawTransaction === true
          ? Buffer.from(data)
          : bundlr.arbundles
              .createData(data, bundlr.currencyConfig.getSigner(), {
                ...opts,
                anchor: opts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32),
              })
              .getRaw(),
      );
      this.bundlr = bundlr;
      this.signer = bundlr.currencyConfig.getSigner();
    }

    public sign(): Promise<Buffer> {
      return super.sign(this.signer);
    }

    get size(): number {
      return this.getRaw().length;
    }

    async uploadWithReceipt(opts?: UploadOptions): Promise<UploadReceipt> {
      return (await this.bundlr.uploader.uploadTransaction(this, { ...opts, getReceiptSignature: true })).data;
    }

    // parent type union not strictly required, but might be if this type gets extended
    upload(opts: UploadOptions & { getReceiptSignature: true }): Promise<UploadReceipt>;
    upload(opts?: UploadOptions): Promise<UploadResponse>;
    async upload(opts?: UploadOptions): Promise<UploadResponse> {
      return (await this.bundlr.uploader.uploadTransaction(this, opts)).data;
    }

    // static fromRaw(rawTransaction: Buffer, bundlrInstance: Bundlr): BundlrTransaction {
    //   return new BundlrTransaction(rawTransaction, bundlrInstance, { dataIsRawTransaction: true });
    // }
  }
  return BundlrTransaction;
}

// export abstract class BundlrTransaction extends DataItem {}

// export interface BundlrTransaction extends DataItem {
//   size: number;
//   uploadWithReceipt(opts?: UploadOptions): Promise<UploadReceipt>;
//   upload(opts: UploadOptions & { getReceiptSignature: true }): Promise<UploadReceipt>;
//   upload(opts?: UploadOptions): Promise<UploadResponse>;
// }
