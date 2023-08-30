// import "../common/hack.js";
import Api from "../common/api";
import Fund from "../common/fund";
import Irys from "../common/irys";
import type { IrysConfig } from "../common/types";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import getTokenConfig from "./tokens/index";
import { Provenance } from "../common/provenance";
import { Transaction } from "../common/transactions";
import type { WebToken } from "./types";
import * as arbundles from "./utils";

export default class WebIrys extends Irys {
  public tokenConfig: WebToken;

  constructor({ url, token, provider, config }: { url: "node1" | "node2" | "devnet" | string; token: string; provider?: any; config?: IrysConfig }) {
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
    this.tokenConfig = getTokenConfig(this, token.toLowerCase(), provider, config?.providerUrl, config?.contractAddress);
    this.token = this.tokenConfig.name;
    if (parsed.host === "devnet.irys.network" && !(config?.providerUrl || this.tokenConfig.inheritsRPC))
      throw new Error(`Using ${parsed.host} requires a dev/testnet RPC to be configured! see https://docs.irys.network/sdk/using-devnet`);
    this.utils = new Utils(this.api, this.token, this.tokenConfig);
    this.uploader = new Uploader(this.api, this.utils, this.token, this.tokenConfig, this.IrysTransaction);
    this.funder = new Fund(this.utils);
    this.provenance = new Provenance(this);
    this.transactions = new Transaction(this);
    this.address = "Please run `await Irys.ready()`";
  }
}
