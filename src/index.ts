
import Api, { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawl";

export interface Config {
    wallet: JWKInterface,
    address?: string,
    APIConfig: ApiConfig
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
    private config: Config
    public getBalance;
    public addBalance;
    public withdrawBalance;
    public getAddress;
    public API;
    public APIConfig;
    public utils;

    private constructor(config: Config) {
        this.APIConfig = config.APIConfig;
        this.API = new Api(this.APIConfig); //borrow their nice Axios API :p
        this.config = config;
        this.utils = new Utils(this.API, this.config);
        //proxy the 'proper' value.
        this.getBalance = async () => { return this.utils.getBalance(this.config.address) };
        this.getAddress = this.utils.getAddress;
        // this.withdrawBalance = (new WithdrawBalance(this.utils, this.config.wallet)).withdrawBalance;
        this.withdrawBalance = withdrawBalance;

    }
    private async _init() {
        // for any async constructor operations
        // as async constructors are generally hacky
        this.config.address = await this.getAddress();
    }
    static async init(config: Config): Promise<Bundlr> {
        const instance = new Bundlr(config);
        await instance._init();
        return instance;
    }


}