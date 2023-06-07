import type { IrysConfig } from "../common/types";
import Api from "../common/api";
import Irys from "../common/irys";
import Fund from "../common/fund";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import getCurrency from "./currencies/index";
// import WebFund from "./fund";
import type { WebCurrency } from "./types";
import * as arbundles from "./utils";
import { Provenance } from "common/provenance";
import { Transaction } from "common/transactions";

export default class WebIrys extends Irys {
  public currencyConfig: WebCurrency;

  constructor({ url, currency, provider, config }: { url: string; currency: string; provider?: any; config?: IrysConfig }) {
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
    if (parsed.host === "devnet.Irys.network" && !(config?.providerUrl || this.currencyConfig.inheritsRPC))
      throw new Error(`Using ${parsed.host} requires a dev/testnet RPC to be configured! see https://docs.Irys.network/sdk/using-devnet`);
    this.utils = new Utils(this.api, this.currency, this.currencyConfig);
    this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig, this.IrysTransaction);
    this.funder = new Fund(this.utils);
    this.provenance = new Provenance(this);
    this.transactions = new Transaction(this);
    this.address = "Please run `await Irys.ready()`";
  }
}
