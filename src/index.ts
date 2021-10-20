
import Api, { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";
import { withdrawBalance } from "./withdrawl";
import Uploader from "./upload";
import Fund from "./fund";
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
    public getLoadedBalance;
    public gatewayConfig;
    public fund
    private funder;

    constructor(config: Config) {
        this.APIConfig = config.APIConfig;
        this.gatewayConfig = config.gatewayConfig
        this.API = new Api(this.APIConfig); //borrow their nice Axios API :p
        this.config = config;
        this.address = config.address;
        this.utils = new Utils(this.API, this.config);
        //proxy the 'proper' value.
        this.getLoadedBalance = async () => { return this.utils.getBalance(this.config.address) };
        this.getBalance = async (address) => { return this.utils.getBalance(address) };
        this.getAddress = this.utils.getAddress;
        this.withdrawBalance = withdrawBalance;
        if (!this.config.address) {
            this.config.address = this.getAddress();
        }
        //console.log(`init: address: ${this.config.address}`);
        this.uploader = new Uploader(this.APIConfig, this.config);
        this.upload = this.uploader.upload;
        this.funder = new Fund(this.config, this.utils);
        this.fund = async (amount) => { return this.funder.fund(amount) };

    }

}