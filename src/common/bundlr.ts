import Utils from "./utils";
import { withdrawBalance } from "./withdrawal";
import Uploader from "./upload";
import Fund from "./fund";
import { AxiosResponse } from "axios";
import { Currency } from "../node/currencies";
import { DataItemCreateOptions } from "arbundles";
import BundlrTransaction from "./transaction";
import Api from "./api";
import BigNumber from "bignumber.js";

// let currencies;

export default abstract class Bundlr {
    public api: Api;
    public utils: Utils;
    public uploader: Uploader;
    public funder: Fund;
    public address;
    public currency;
    public wallet;
    public currencyConfig: Currency;

    constructor() { return }

    async withdrawBalance(amount: BigNumber): Promise<AxiosResponse<any>> {
        return await withdrawBalance(this.utils, this.api, amount);
    }

    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    async getLoadedBalance(): Promise<BigNumber> {
        return this.utils.getBalance(this.address)
    }
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    async getBalance(address: string): Promise<BigNumber> {
        return this.utils.getBalance(address)
    }
    /**
     * Sends amount winston to the specified bundler
     * @param amount amount to send in winston
     * @returns Arweave transaction
     */
    async fund(amount: BigNumber, multiplier?: number): Promise<any> {
        return this.funder.fund(amount, multiplier)
    }

    /**
     * Create a new BundlrTransactions (flex currency arbundles dataItem)
     * @param data 
     * @param opts - dataItemCreateOptions
     * @returns - a new BundlrTransaction instance
     */
    createTransaction(data: string | Uint8Array, opts?: DataItemCreateOptions): BundlrTransaction {
        return new BundlrTransaction(data, this, opts);
    }
}