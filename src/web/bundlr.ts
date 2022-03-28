import { BundlrConfig, Currency } from "common/types";
import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import getCurrency from "./currencies";
import { WebCurrency } from "./types";

export default class WebBundlr extends Bundlr {
    public currencyConfig: WebCurrency;
    constructor(url: string, currency: WebCurrency, config?: { timeout?: number, providerUrl?: string }) {
        super();
        const parsed = new URL(url);
        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: config?.timeout ?? 100000 });
        // eslint-disable-next-line @typescript-eslint/no-var-requires

        this.currencyConfig = currency
        this.currency = this.currencyConfig.name
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig);
        // this.funder = new WebFund(this.utils);
        this.funder = new Fund(this.utils)
    }

    // async initialisation 
    public async ready(): Promise<void> {
        if (this.currencyConfig.ready) {
            await this.currencyConfig.ready()
        }
        this.address = this.currencyConfig.address
    }

    static newBundlr(url: string, currency: string, wallet: any, config?: BundlrConfig): WebBundlr {
        const cConfig = getCurrency(currency, wallet, config?.providerUrl, config?.contractAddress)
        return new WebBundlr(url, cConfig, config)
    }
}
