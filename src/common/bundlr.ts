import Utils from "./utils";
import { withdrawBalance } from "./withdrawal";
import type Uploader from "./upload";
import type Fund from "./fund";
import type { DataItemCreateOptions } from "arbundles";
import type Api from "./api";
import type BigNumber from "bignumber.js";
import type { BundlrTransaction } from "./types";
import type {
  Arbundles,
  BundlrTransactionCreateOptions,
  BundlrTransactonCtor,
  CreateAndUploadOptions,
  Currency,
  FundResponse,
  UploadReceipt,
  UploadReceiptData,
  UploadResponse,
  WithdrawalResponse,
} from "./types";
import type { Signer } from "arbundles";
import type { Readable } from "stream";
import buildBundlrTransaction from "./transaction";

export default abstract class Bundlr {
  public api!: Api;
  public utils!: Utils;
  public uploader!: Uploader;
  public funder!: Fund;
  public address!: string | undefined;
  public currency!: string;
  public currencyConfig!: Currency;
  protected _readyPromise: Promise<void> | undefined;
  public url: URL;
  public arbundles: Arbundles;
  public bundlrTransaction: BundlrTransactonCtor;

  static VERSION = "REPLACEMEBUNDLRVERSION";

  constructor({ url, arbundles }: { url: URL; arbundles: Arbundles }) {
    this.url = url;
    this.arbundles = arbundles;
    this.bundlrTransaction = buildBundlrTransaction(this);
  }

  get signer(): Signer {
    return this.currencyConfig.getSigner();
  }

  async withdrawBalance(amount: BigNumber.Value): Promise<WithdrawalResponse> {
    return withdrawBalance(this.utils, this.api, amount);
  }

  /**
   * Gets the balance for the loaded wallet
   * @returns balance (in winston)
   */
  async getLoadedBalance(): Promise<BigNumber> {
    if (!this.address) throw new Error("address is undefined");
    return this.utils.getBalance(this.address);
  }
  /**
   * Gets the balance for the specified address
   * @param address address to query for
   * @returns the balance (in winston)
   */
  async getBalance(address: string): Promise<BigNumber> {
    return this.utils.getBalance(address);
  }

  /**
   * Sends amount atomic units to the specified bundler
   * @param amount amount to send in atomic units
   * @returns details about the fund transaction
   */
  async fund(amount: BigNumber.Value, multiplier?: number): Promise<FundResponse> {
    return this.funder.fund(amount, multiplier);
  }

  /**
   * Calculates the price for [bytes] bytes for the loaded currency and Bundlr node.
   * @param bytes
   * @returns
   */
  public async getPrice(bytes: number): Promise<BigNumber> {
    return this.utils.getPrice(this.currency, bytes);
  }

  public async verifyReceipt(receipt: UploadReceiptData): Promise<boolean> {
    return Utils.verifyReceipt(this.arbundles, receipt);
  }

  /**
   * Create a new BundlrTransactions (flex currency arbundles dataItem)
   * @param data
   * @param opts - dataItemCreateOptions
   * @returns - a new BundlrTransaction instance
   */
  createTransaction(data: string | Buffer, opts?: BundlrTransactionCreateOptions): BundlrTransaction {
    return new this.bundlrTransaction(data, this, opts);
  }

  /**
   * Returns the signer for the loaded currency
   */
  getSigner(): Signer {
    return this.currencyConfig.getSigner();
  }

  async upload(data: string | Buffer | Readable, opts?: CreateAndUploadOptions): Promise<UploadResponse> {
    return this.uploader.uploadData(data, opts);
  }

  async uploadWithReceipt(data: string | Buffer | Readable, opts?: DataItemCreateOptions): Promise<UploadReceipt> {
    return this.uploader.uploadData(data, { ...opts, upload: { getReceiptSignature: true } }) as Promise<UploadReceipt>;
  }

  async ready(): Promise<void> {
    this.currencyConfig.ready ? await this.currencyConfig.ready() : true;
    this.address = this.currencyConfig.address;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get transaction() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const oThis = this;
    return {
      fromRaw(rawTransaction: Uint8Array): BundlrTransaction {
        return new oThis.bundlrTransaction(rawTransaction, oThis, { dataIsRawTransaction: true });
      },
    };
  }
}
