import { BundlrConfig } from "../common/types";
import { Bundlr, Fund, Uploader, Utils } from "../common"
import { importAndGetBundlrFlavour } from "../common/utils";
import { WebCurrency } from "./types";

export default class WebBundlr extends Bundlr {
    declare currencyConfig: WebCurrency;

    /**
    * Initialise a new Bundlr instance using a compatible currency class
    * @param url - URL of the bundlr node to connect to
    * @param currencyConfig - the currency class to use
    * @param config - optional configuratoion tweaks
    */
    constructor(url: string, currencyConfig: WebCurrency, config?: BundlrConfig) {
        super(url, currencyConfig, config)
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig);
        this.funder = new Fund(this.utils)
    }

    /**
    * Readies the loaded currency (if required)
    */
    public async ready(): Promise<void> {
        if (this.currencyConfig.ready) {
            await this.currencyConfig.ready()
        }
        this.address = this.currencyConfig.address
    }

    /**
     * Dynamically initialises a Bundlr instance for the provided currency
     * @param url - URL of the bundlr node to connect to
     * @param currency - the currency to use
     * @param wallet - the wallet object the currency expects
     * @param config - optional configuration tweaks
     * @returns 
     */
    static async init(url: string, currency: string, wallet: any, config?: BundlrConfig): Promise<WebBundlr> {
        const bundlr = await importAndGetBundlrFlavour(currency)
        const newBundlr = new bundlr(url, wallet, config) as WebBundlr
        await newBundlr.ready()
        return newBundlr
    }
}
