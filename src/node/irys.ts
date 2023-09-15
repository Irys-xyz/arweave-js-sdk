// import "../common/hack.js";
import { Transaction } from "../common/transactions";
import Api from "../common/api";
import Fund from "../common/fund";
import Irys from "../common/irys";
import type { CreateAndUploadOptions, IrysConfig, UploadResponse } from "../common/types";
import Utils from "../common/utils";
import getTokenConfig from "./tokens/index";
import type { NodeToken } from "./types";
import NodeUploader from "./upload";
import * as arbundles from "./utils";
import { NodeProvenance } from "./provenance";

export class NodeIrys extends Irys {
  public uploader: NodeUploader; // re-define type
  public tokenConfig: NodeToken;
  public declare provenance: NodeProvenance;

  /**
   * Constructs a new Irys instance, as well as supporting subclasses
   * @param url - URL to the bundler
   * @param key - private key (in whatever form required)
   */
  constructor({ url, token, key, config }: { url: "node1" | "node2" | "devnet" | string; token: string; key?: any; config?: IrysConfig }) {
    switch (url) {
      case undefined:
      case "node1":
        url = "https://node1.irys.xyz";
        break;
      case "node2":
        url = "https://node2.irys.xyz";
        break;
      case "devnet":
        url = "https://devnet.irys.xyz";
        break;
    }

    const parsed = new URL(url);
    super({ url: parsed, arbundles });
    if (parsed.host === "devnet.irys.xyz" && !config?.providerUrl)
      throw new Error(`Using ${parsed.host} requires a dev/testnet RPC to be configured! see https://docs.irys.xyz/developer-docs/using-devnet`);
    this.api = new Api({
      url: parsed,
      timeout: config?.timeout ?? 100000,
      headers: config?.headers,
    });
    this.tokenConfig = getTokenConfig(
      this,
      token.toLowerCase(),
      key,
      parsed.toString(),
      config?.providerUrl,
      config?.contractAddress,
      config?.tokenOpts,
    );
    this.token = this.tokenConfig.name;
    this.address = this.tokenConfig.address;
    this.utils = new Utils(this.api, this.token, this.tokenConfig);
    this.funder = new Fund(this.utils);
    this.uploader = new NodeUploader(this.api, this.utils, this.token, this.tokenConfig, this.IrysTransaction);
    this.provenance = new NodeProvenance(this);
    this.transactions = new Transaction(this);
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
  public static async init(opts: {
    url: string;
    token: string;
    privateKey?: string;
    publicKey?: string;
    signingFunction?: (msg: Uint8Array) => Promise<Uint8Array>;
    collectSignatures?: (msg: Uint8Array) => Promise<{ signatures: string[]; bitmap: number[] }>;
    providerUrl?: string;
    timeout?: number;
    contractAddress?: string;
  }): Promise<NodeIrys> {
    const { url, token, privateKey, publicKey, signingFunction, collectSignatures, providerUrl, timeout, contractAddress } = opts;
    const Irys = new NodeIrys({
      url,
      token,
      key: signingFunction ? publicKey : privateKey,
      config: {
        providerUrl,
        timeout,
        contractAddress,
        tokenOpts: { signingFunction, collectSignatures },
      },
    });
    await Irys.ready();
    return Irys;
  }
}
export default NodeIrys;
