import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Uploader from "../common/upload";
import Utils from "../common/utils";
import WebFund from "./fund";


let currencies;
export const keys: { [key: string]: { key: string, address: string } } = {};
export default class WebBundlr extends Bundlr {

    constructor(url: string, currency: string, provider?: any) {
        super();
        this.currency = currency;
        if (!provider) {
            provider = "default";
        }
        keys[currency] = { key: provider, address: undefined };
        this.wallet = provider;
        const parsed = new URL(url);

        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        currencies = (require("./currencies/index")).currencies;
        if (!currencies[currency]) {
            throw new Error(`Unknown/Unsuported currency ${currency}`);
        }
        this.currencyConfig = currencies[currency];
        this.currencyConfig.account.address = this.address;
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, currency, this.currencyConfig);
        this.funder = new WebFund(this.utils);
    }

    //async initialisation 
    public async ready(): Promise<void> {
        const pkey = await this.currencyConfig.getPublicKey();
        const address = this.currencyConfig.ownerToAddress(pkey);
        this.address = address;
        this.currencyConfig.account.address = address

        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
    }
}
