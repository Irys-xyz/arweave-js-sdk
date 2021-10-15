import arweave from 'arweave';
import Api from 'arweave/node/lib/api';
import { Config } from '.';

export default class Utils {
    private API: Api;
    private config: Config;

    constructor(API: Api, config: Config) {
        this.API = API;
        this.config = config;
    };

    public async getNonce(): Promise<number> {
        return (await this.API.get(`/account/withdrawls?address=${this.config.address}`)).data;
    }

    public async getBalance(address: string): Promise<number> {
        return (await this.API.get(`/account/balance?address=${address}`)).data.balance;
    }

    public async getAddress(): Promise<string> {
        //fallback method
        //return (new arweave({}).wallets.jwkToAddress(jwk));
        return arweave.utils.bufferTob64Url(await arweave.crypto.hash(arweave.utils.b64UrlToBuffer(this.config.wallet.n)));
    }
}