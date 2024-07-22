import type { DataItemCreateOptions, Signer } from "arbundles";
import type BigNumber from "bignumber.js";
import type { Readable } from "stream";
import type Api from "./api";
import type Fund from "./fund";
import type { Provenance } from "./provenance";
import buildIrysTransaction from "./transaction";
import type { Transaction } from "./transactions";
import type {
  Arbundles,
  CreateAndUploadOptions,
  Token,
  FundResponse,
  IrysTransaction,
  IrysTransactionCreateOptions,
  IrysTransactonCtor,
  UploadReceipt,
  UploadReceiptData,
  UploadResponse,
  WithdrawalResponse,
  Network,
} from "./types";
import type Uploader from "./upload";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawal";
import Query from "@irys/query";
import type { Approval } from "./approval";

export default abstract class Irys {
  public api!: Api;
  public utils!: Utils;
  public uploader!: Uploader;
  public funder!: Fund;
  public _address: string | undefined;
  public token!: string;
  public tokenConfig!: Token;
  public provenance!: Provenance;
  public transactions!: Transaction;
  public approval!: Approval;
  protected _readyPromise: Promise<void> | undefined;
  public url: URL;
  public arbundles: Arbundles;
  public IrysTransaction: IrysTransactonCtor;
  static VERSION = "REPLACEMEIRYSVERSION";
  public debug = false;

  constructor({ url, network, arbundles }: { url?: string; network?: Network; arbundles: Arbundles }) {
    switch (network) {
      // case undefined:
      case "mainnet":
        url = "https://arweave.mainnet.irys.xyz";
        break;
      case "devnet":
        url = "https://arweave.devnet.irys.xyz";
        break;
    }
    if (!url) throw new Error(`Missing required Irys constructor parameter: URL or valid Network`);
    const parsed = new URL(url);

    this.url = parsed;
    this.arbundles = arbundles;
    this.IrysTransaction = buildIrysTransaction(this);
  }

  get address(): string {
    if (!this._address) throw new Error("Address is undefined, please provide a wallet or run `await irys.ready()`");
    return this._address;
  }

  set address(address: string) {
    this._address = address;
  }

  get signer(): Signer {
    return this.tokenConfig.getSigner();
  }

  get search(): InstanceType<typeof Query>["search"] {
    const q = new Query({ url: new URL("/graphql", this.url) });
    return q.search.bind(q);
  }

  public query(queryOpts?: ConstructorParameters<typeof Query>[0]): Query {
    return new Query(queryOpts ?? { url: new URL("graphql", this.url) });
  }

  async withdrawBalance(amount: BigNumber.Value | "all"): Promise<WithdrawalResponse> {
    return withdrawBalance(this.utils, this.api, amount);
  }

  async withdrawAll(): Promise<WithdrawalResponse> {
    return withdrawBalance(this.utils, this.api, "all");
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
   * Calculates the price for [bytes] bytes for the loaded token and Irys node.
   * @param bytes
   * @returns
   */
  public async getPrice(bytes: number): Promise<BigNumber> {
    return this.utils.getPrice(this.token, bytes);
  }

  public async verifyReceipt(receipt: UploadReceiptData): Promise<boolean> {
    return Utils.verifyReceipt(this.arbundles, receipt);
  }

  /**
   * Create a new IrysTransactions (flex token arbundles dataItem)
   * @param data
   * @param opts - dataItemCreateOptions
   * @returns - a new IrysTransaction instance
   */
  createTransaction(data: string | Buffer, opts?: IrysTransactionCreateOptions): IrysTransaction {
    return new this.IrysTransaction(data, this, opts);
  }

  /**
   * Returns the signer for the loaded token
   */
  getSigner(): Signer {
    return this.tokenConfig.getSigner();
  }

  async upload(data: string | Buffer | Readable, opts?: CreateAndUploadOptions): Promise<UploadResponse> {
    return this.uploader.uploadData(data, opts);
  }

  /**
   * @deprecated - use upload instead
   */
  async uploadWithReceipt(data: string | Buffer | Readable, opts?: DataItemCreateOptions): Promise<UploadReceipt> {
    return this.uploader.uploadData(data, { ...opts }) as Promise<UploadReceipt>;
  }

  async ready(): Promise<this> {
    this.tokenConfig.ready ? await this.tokenConfig.ready() : true;
    this.address = this.tokenConfig.address!;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get transaction() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const oThis = this;
    return {
      fromRaw(rawTransaction: Uint8Array): IrysTransaction {
        return new oThis.IrysTransaction(rawTransaction, oThis, { dataIsRawTransaction: true });
      },
    };
  }
}
