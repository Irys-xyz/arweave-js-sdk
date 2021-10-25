import Api, { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawl";
import Uploader from "./upload";
import Fund from "./fund";
import { URL } from "url";
import * as crypto from "crypto";
import base64url from "base64url";
import Transaction from "arweave/node/lib/transaction";
import { AxiosResponse } from "axios";

export interface Config {
    wallet: JWKInterface,
    address?: string,
    APIConfig: ApiConfig,
    gatewayConfig: ApiConfig,
}

// export interface ApiConfig {
//     host?: string;
//     protocol?: string;
//     port?: string | number;
//     timeout?: number;
//     logging?: boolean;
//     logger?: Function;
//   }


export default class Bundlr {
    public withdrawBalance;
    public api: Api;
    public utils: Utils;
    public address: string;
    private uploader: Uploader;
    private funder: Fund;
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - JWK in JSON
     */
    constructor(url: string, wallet?: JWKInterface) {
        const parsed = new URL(url);
        this.api = new Api({ ...parsed, host: parsed.hostname }); //borrow their nice Axios API :p
        this.address = wallet ? base64url.encode(
            crypto.createHash("sha256")
                .update(base64url.toBuffer(wallet.n))
                .digest()) : undefined;
        this.utils = new Utils(this.api, { address: this.address, wallet });
        this.withdrawBalance = async (amount: number) => await withdrawBalance(this.utils, this.api, wallet, amount);
        this.uploader = new Uploader(this.api.config, wallet);
        // this.upload = this.uploader.upload; note to self: don't do this, this destorys 'this' scoping for instantiated subclasses
        this.funder = new Fund(this.utils, wallet);
    }
    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    async getLoadedBalance(): Promise<number> {
        return this.utils.getBalance(this.address)
    }
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    async getBalance(address: string): Promise<number> {
        return this.utils.getBalance(address)
    }
    /**
     * Sends amount winston to the specified bundler
     * @param amount amount to send in winston
     * @returns Arweave transaction
     */
    async fund(amount: number): Promise<Transaction> {
        return this.funder.fund(amount)
    }
    /**
     * Upload a file at the specified path to the bundler
     * @param path path to the file to upload
     * @returns bundler response
     */
    async uploadFile(path: string): Promise<AxiosResponse<any>> {
        return this.uploader.uploadFile(path);
    };
}
