import { AxiosResponse } from "axios";
import { BundlrConfig } from "common/types";
import { Bundlr, Fund, Utils } from "../common"
import { importAndGetBundlrFlavour } from "../common/utils";
import { NodeCurrency } from "./types";
import NodeUploader from "./upload";


export default class NodeBundlr extends Bundlr {
    public uploader: NodeUploader; // re-define type
    declare currencyConfig: NodeCurrency;

    /**
     * Initialise a new Bundlr instance using a compatible currency class
     * @param url - URL of the bundlr node to connect to
     * @param currencyConfig - the currency class to use
     * @param config - optional configuratoion tweaks
     */
    constructor(url: string, currencyConfig: NodeCurrency, config?: BundlrConfig) {
        super(url, currencyConfig, config)

        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new NodeUploader(this.api, this.utils, this.currency, this.currencyConfig);
        this.funder = new Fund(this.utils)
    }


    /**
     * Upload a file at the specified path to the bundler
     * @param path path to the file to upload
     * @returns bundler response
     */
    async uploadFile(path: string): Promise<AxiosResponse<any>> {
        return this.uploader.uploadFile(path);
    };

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
    static async init(url: string, currency: string, wallet: any, config?: BundlrConfig): Promise<NodeBundlr> {
        const bundlr = await importAndGetBundlrFlavour(currency)
        const newBundlr = new bundlr(url, wallet, config) as NodeBundlr
        await newBundlr.ready()
        return newBundlr
    }

}