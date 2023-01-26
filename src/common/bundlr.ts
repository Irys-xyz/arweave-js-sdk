import Utils from "./utils";
import { withdrawBalance } from "./withdrawal";
import Uploader from "./upload";
import Fund from "./fund";
import { DataItemCreateOptions } from "arbundles";
import BundlrTransaction from "./transaction";
import Api from "./api";
import BigNumber from "bignumber.js";
import { CreateAndUploadOptions, Currency, FundResponse, UploadReceipt, UploadResponse, WithdrawalResponse } from "./types";
import { Signer } from "arbundles/src/signing";
import { Readable } from "stream";

export default abstract class Bundlr {
    public api: Api;
    public utils: Utils;
    public uploader: Uploader;
    public funder: Fund;
    public address;
    public currency;
    public currencyConfig: Currency;
    protected _readyPromise: Promise<void>;
    public url: URL;

    constructor(url) { this.url = url; }

    get signer(): Signer {
        return this.currencyConfig.getSigner();
    }

    async withdrawBalance(amount: BigNumber.Value): Promise<WithdrawalResponse> {
        return withdrawBalance(this.utils, this.api, amount);
    }

    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    async getLoadedBalance(): Promise<BigNumber> {
        return this.utils.getBalance(this.address);
    }
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    async getBalance(address: string): Promise<BigNumber> {
        return this.utils.getBalance(address);
    }

    /**
     * Sends amount atomic units to the specified bundler
     * @param amount amount to send in atomic units
     * @returns details about the fund transaction
     */
    async fund(amount: BigNumber.Value, multiplier?: number): Promise<FundResponse> {
        return this.funder.fund(amount, multiplier);
    }

    /**
     * Calculates the price for [bytes] bytes for the loaded currency and Bundlr node.
     * @param bytes 
     * @returns 
     */
    public async getPrice(bytes: number): Promise<BigNumber> {
        return this.utils.getPrice(this.currency, bytes);
    }

    public async verifyReceipt(receipt: UploadReceipt): Promise<boolean> {
        return Utils.verifyReceipt(receipt);
    }

    /**
     * Create a new BundlrTransactions (flex currency arbundles dataItem)
     * @param data 
     * @param opts - dataItemCreateOptions
     * @returns - a new BundlrTransaction instance
     */
    createTransaction(data: string | Buffer, opts?: DataItemCreateOptions): BundlrTransaction {
        return new BundlrTransaction(data, this, opts);
    }

    /**
     * Returns the signer for the loaded currency
     */
    getSigner(): Signer {
        return this.currencyConfig.getSigner();
    }

    async upload(data: string | Buffer | Readable, opts?: CreateAndUploadOptions): Promise<UploadResponse | UploadReceipt> {
        return this.uploader.uploadData(data, opts);
    }

    async ready(): Promise<void> {
        this.currencyConfig.ready ? await this.currencyConfig.ready() : true;
        this.address = this.currencyConfig.address;
    }

    get transaction() {
        const oThis = this;
        return {
            fromRaw(rawTransaction: Uint8Array): BundlrTransaction {
                return new BundlrTransaction(rawTransaction, oThis, { dataIsRawTransaction: true });
            }
        };
    }

}