import "../common/hack.js";
import { Transaction } from "../common/transactions";
import Api from "../common/api";
import Fund from "../common/fund";
import Irys from "../common/irys";
import type { CreateAndUploadOptions, IrysConfig, Network, UploadResponse } from "../common/types";
import Utils from "../common/utils";
import type { NodeToken } from "./types";
import NodeUploader from "./upload";
import * as arbundles from "./utils";
import { NodeProvenance } from "./provenance";
import { Approval } from "../common/approval";

export class BaseNodeIrys extends Irys {
  public uploader: NodeUploader; // re-define type
  public tokenConfig: NodeToken;
  public declare provenance: NodeProvenance;

  /**
   * Constructs a new Irys instance, as well as supporting subclasses
   * @param url - URL to the bundler
   * @param key - private key (in whatever form required)
   */
  constructor({
    url,
    network,
    config,
    getTokenConfig,
  }: {
    url?: string;
    network?: Network;
    config?: IrysConfig;
    getTokenConfig: (irys: BaseNodeIrys) => NodeToken;
  }) {
    super({ url, network, arbundles });
    this.debug = config?.debug ?? false;

    this.api = new Api({
      url: this.url,
      timeout: config?.timeout ?? 100000,
      headers: config?.headers,
    });
    this.tokenConfig = getTokenConfig(this);

    if (this.url.host.includes("devnet.irys.xyz") && !config?.providerUrl)
      throw new Error(`Using ${this.url.host} requires a dev/testnet RPC to be configured! see https://docs.irys.xyz/developer-docs/using-devnet`);

    this.token = this.tokenConfig.name;
    this.address = this.tokenConfig.address!;
    this.utils = new Utils(this.api, this.token, this.tokenConfig);
    this.funder = new Fund(this.utils);
    this.uploader = new NodeUploader(this.api, this.utils, this.token, this.tokenConfig, this.IrysTransaction);
    this.provenance = new NodeProvenance(this);
    this.transactions = new Transaction(this);
    this.approval = new Approval(this);
    this._readyPromise = this.tokenConfig.ready ? this.tokenConfig.ready() : new Promise((r) => r());
  }

  /**
   * Upload a file at the specified path to the bundler
   * @param path path to the file to upload
   * @returns bundler response
   */
  async uploadFile(path: string, opts?: CreateAndUploadOptions): Promise<UploadResponse> {
    return this.uploader.uploadFile(path, opts);
  }

  /**
   * @param path - path to the folder to be uploaded
   * @param indexFile - path to the index file (i.e index.html)
   * @param batchSize - number of items to upload concurrently
   * @param interactivePreflight - whether to interactively prompt the user for confirmation of upload (CLI ONLY)
   * @param keepDeleted - Whether to keep previously uploaded (but now deleted) files in the manifest
   * @param logFunction - for handling logging from the uploader for UX
   * @param manifestTags - For allowing the caller to pass tags that will be added to the manifest transaction.
   * @returns
   */
  public async uploadFolder(
    path: string,
    {
      batchSize = 10,
      keepDeleted = true,
      indexFile,
      interactivePreflight,
      logFunction,
      manifestTags,
      itemOptions,
    }: {
      batchSize?: number;
      keepDeleted?: boolean;
      indexFile?: string;
      interactivePreflight?: boolean;
      logFunction?: (log: string) => Promise<void>;
      manifestTags?: { name: string; value: string }[];
      itemOptions?: CreateAndUploadOptions;
    } = {},
  ): Promise<UploadResponse | undefined> {
    return this.uploader.uploadFolder(path, { indexFile, batchSize, interactivePreflight, keepDeleted, logFunction, manifestTags, itemOptions });
  }
}
export default BaseNodeIrys;
