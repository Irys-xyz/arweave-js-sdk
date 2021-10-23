import Api, { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawl";
import Uploader from "./upload";
import Fund from "./fund";
import { URL } from "url";
import * as crypto from "crypto";
import base64url from "base64url";

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
    private uploader;
    private funder;

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

    async getLoadedBalance() {
        return this.utils.getBalance(this.address)
    }

    async getBalance(address) {
        return this.utils.getBalance(address)
    }

    async fund(amount) {
        return this.funder.fund(amount)
    }
    async uploadFile(path) {
        return this.uploader.uploadFile(path);
    };
}
