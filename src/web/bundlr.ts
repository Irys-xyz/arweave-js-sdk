import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import getCurrency from "./currencies";
// import WebFund from "./fund";
import { WebCurrency } from "./types";

export default class WebBundlr extends Bundlr {
    public currencyConfig: WebCurrency;

    constructor(url: string, currency: string, provider?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string; }) {
        super();
        const parsed = new URL(url);
        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: config?.timeout ?? 100000 });
        this.currencyConfig = getCurrency(currency.toLowerCase(), provider, config?.providerUrl, config?.contractAddress);
        this.currency = this.currencyConfig.name
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig);
        this.funder = new Fund(this.utils);
        this._readyPromise = this.currencyConfig.ready ? this.currencyConfig.ready() : new Promise((r => r()))
    }

    // async initialisation 
    public async ready(): Promise<void> {
        await this._readyPromise
        // await this.currencyConfig.ready();
        this.address = this.currencyConfig.address;
    }
}
