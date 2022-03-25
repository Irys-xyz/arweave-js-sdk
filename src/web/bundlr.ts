import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import { WebCurrency } from "./types";

export default class WebBundlr extends Bundlr {
    public currencyConfig: WebCurrency;
    constructor(url: string, currency: string, provider?: any, config?: { timeout?: number, providerUrl?: string }) {
        super();
        const parsed = new URL(url);
        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: config?.timeout ?? 100000 });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.currency = currency.toLowerCase();
        this.currencyConfig = provider
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig);
        // this.funder = new WebFund(this.utils);
        this.funder = new Fund(this.utils)
    }

    // async initialisation 
    public async ready(): Promise<void> {
        await this.currencyConfig.ready()
        this.address = this.currencyConfig.address
    }
}
