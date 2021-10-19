
import Api, { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawl";
import Uploader from "./upload";
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
    public address;
    private uploader;
    public upload;

    constructor(config: Config) {
        this.APIConfig = config.APIConfig;
        this.API = new Api(this.APIConfig); //borrow their nice Axios API :p
        this.config = config;
        this.address = config.address;
        this.utils = new Utils(this.API, this.config);
        //proxy the 'proper' value.
        this.getBalance = async () => { return this.utils.getBalance(this.config.address) };
        this.getAddress = this.utils.getAddress;
        // this.withdrawBalance = (new WithdrawBalance(this.utils, this.config.wallet)).withdrawBalance;
        this.withdrawBalance = withdrawBalance;
        if (!this.config.address) {
            console.log(this.config.address)
            this.config.address = this.getAddress();
        }
        this.uploader = new Uploader(this.APIConfig, this.config);
        this.upload = this.uploader.upload;

    }
    // private async _init() {
    //     // for any async constructor operations
    //     // as async constructors are generally hacky
    //     this.config.address = await this.getAddress();
    // }
    // static async init(config: Config): Promise<Bundlr> {
    //     const instance = new Bundlr(config);
    //     await instance._init();
    //     return instance;
    // }


}