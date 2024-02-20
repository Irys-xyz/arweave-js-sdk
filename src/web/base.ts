import "../common/hack.js";
import Api from "../common/api";
import Fund from "../common/fund";
import Irys from "../common/irys";
import Utils from "../common/utils";
import { Provenance } from "../common/provenance";
import { Transaction } from "../common/transactions";
import type { WebToken } from "./types";
import * as arbundles from "./utils";
import { WebUploader } from "./upload";
import type { IrysConfig } from "../common/types";
import { Checkpointing } from "src/common/checkpointing";

export class BaseWebIrys extends Irys {
  public tokenConfig: WebToken;
  public uploader: WebUploader;
  uploadFolder: InstanceType<typeof WebUploader>["uploadFolder"];
  uploadFile: InstanceType<typeof WebUploader>["uploadFile"];

  constructor({
    url,
    wallet,
    config,
    getTokenConfig,
  }: {
    url: "node1" | "node2" | "devnet" | string;
    wallet?: { rpcUrl?: string; name?: string; provider: object };
    config?: IrysConfig;
    getTokenConfig: (irys: BaseWebIrys) => WebToken;
  }) {
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
    // @ts-expect-error types
    super({ url: parsed, arbundles });

    this.api = new Api({
      url: parsed,
      timeout: config?.timeout ?? 100000,
      headers: config?.headers,
    });
    this.tokenConfig = getTokenConfig(this);
    this.token = this.tokenConfig.name;
    if (parsed.host === "devnet.irys.network" && !(config?.providerUrl ?? (wallet?.rpcUrl || this.tokenConfig.inheritsRPC)))
      throw new Error(`Using ${parsed.host} requires a dev/testnet RPC to be configured! see https://docs.irys.network/sdk/using-devnet`);
    this.utils = new Utils(this.api, this.token, this.tokenConfig);
    this.uploader = new WebUploader(this);
    this.funder = new Fund(this.utils);
    this.uploader = new WebUploader(this);
    this.provenance = new Provenance(this);
    this.transactions = new Transaction(this);
    this.checkpointing = new Checkpointing(this);
    this.address = "Please run `await Irys.ready()`";
    this.uploadFolder = this.uploader.uploadFolder.bind(this.uploader);
    this.uploadFile = this.uploader.uploadFile.bind(this.uploader);
  }
}
