import "../common/hack.js";
import type { BundlrConfig } from "../common/types";
import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Utils from "../common/utils";
import getCurrency from "./currencies/index";
// import WebFund from "./fund";
import type { WebCurrency } from "./types";
import * as arbundles from "./utils";
import { WebUploader } from "./upload";

export class WebBundlr extends Bundlr {
  public currencyConfig: WebCurrency;
  public uploader: WebUploader;
  uploadFolder: InstanceType<typeof WebUploader>["uploadFolder"];

  constructor(url: string, currency: string, provider?: any, config?: BundlrConfig) {
    const parsed = new URL(url);
    // @ts-expect-error private type issue
    super(parsed, arbundles);

    this.api = new Api({
      protocol: parsed.protocol.slice(0, -1),
      port: parsed.port,
      host: parsed.hostname,
      timeout: config?.timeout ?? 100000,
      headers: config?.headers,
    });
    this.currencyConfig = getCurrency(this, currency.toLowerCase(), provider, config?.providerUrl, config?.contractAddress);
    this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: config?.timeout ?? 100000 });
    this.currency = this.currencyConfig.name;
    if (parsed.host === "devnet.bundlr.network" && !(config?.providerUrl || this.currencyConfig.inheritsRPC))
      throw new Error(`Using ${parsed.host} requires a dev/testnet RPC to be configured! see https://docs.bundlr.network/sdk/using-devnet`);
    this.utils = new Utils(this.api, this.currency, this.currencyConfig);
    this.uploader = new WebUploader(this);
    this.funder = new Fund(this.utils);
    this.address = "Please run `await bundlr.ready()`";
    this.uploadFolder = this.uploader.uploadFolder;
  }
}
export default WebBundlr;
