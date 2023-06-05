import type { Signer } from "arbundles";
import type Irys from "./irys";
import Crypto from "crypto";
import type {
  IrysTransaction as IIrysTransaction,
  IrysTransactionCreateOptions,
  UploadOptions,
  UploadReceipt,
  UploadResponse,
  IrysTransactonCtor,
} from "./types";

/**
 * Extended DataItem that allows for seamless Irys operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */

export default function buildIrysTransaction(irys: Pick<Irys, "uploader" | "currencyConfig" | "arbundles">): IrysTransactonCtor {
  class IrysTransaction extends irys.arbundles.DataItem implements IIrysTransaction {
    public Irys: Pick<Irys, "uploader" | "currencyConfig" | "arbundles">;
    public signer: Signer;

    constructor(data: string | Uint8Array, irys: Pick<Irys, "uploader" | "currencyConfig" | "arbundles">, opts?: IrysTransactionCreateOptions) {
      super(
        opts?.dataIsRawTransaction === true
          ? Buffer.from(data)
          : irys.arbundles
              .createData(data, irys.currencyConfig.getSigner(), {
                ...opts,
                anchor: opts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32),
              })
              .getRaw(),
      );
      this.Irys = irys;
      this.signer = irys.currencyConfig.getSigner();
    }

    public sign(): Promise<Buffer> {
      return super.sign(this.signer);
    }

    get size(): number {
      return this.getRaw().length;
    }

    async uploadWithReceipt(opts?: UploadOptions): Promise<UploadReceipt> {
      return (await this.Irys.uploader.uploadTransaction(this, { ...opts, getReceiptSignature: true })).data;
    }

    // parent type union not strictly required, but might be if this type gets extended
    upload(opts: UploadOptions & { getReceiptSignature: true }): Promise<UploadReceipt>;
    upload(opts?: UploadOptions): Promise<UploadResponse>;
    async upload(opts?: UploadOptions): Promise<UploadResponse> {
      return (await this.Irys.uploader.uploadTransaction(this, opts)).data;
    }

    // static fromRaw(rawTransaction: Buffer, IrysInstance: Irys): IrysTransaction {
    //   return new IrysTransaction(rawTransaction, IrysInstance, { dataIsRawTransaction: true });
    // }
  }
  return IrysTransaction;
}

// export abstract class IrysTransaction extends DataItem {}

// export interface IrysTransaction extends DataItem {
//   size: number;
//   uploadWithReceipt(opts?: UploadOptions): Promise<UploadReceipt>;
//   upload(opts: UploadOptions & { getReceiptSignature: true }): Promise<UploadReceipt>;
//   upload(opts?: UploadOptions): Promise<UploadResponse>;
// }
