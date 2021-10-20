import arweave from 'arweave';
import Api from 'arweave/node/lib/api';
import { Config } from '.';
import crypto from 'crypto';


export default class Utils {
    private API: Api;
    private config: Config;

    constructor(API: Api, config: Config) {
        this.API = API;
        this.config = config;
    };

    public async getNonce(): Promise<number> {
        let res = await this.API.get(`/account/withdrawls?address=${this.config.address}`);
        this.checkAndThrow(res);
        return (res).data;

    }

    public async getBalance(address: string): Promise<number> {
        let res = await this.API.get(`/account/balance?address=${address}`);
        this.checkAndThrow(res);
        return (res).data.balance;
    }

    public getAddress(): string {
        //fallback method
        //return (new arweave({}).wallets.jwkToAddress(jwk));
        //return arweave.utils.bufferTob64Url(await arweave.crypto.hash(arweave.utils.b64UrlToBuffer(this.config.wallet.n)));
        return arweave.utils.bufferTob64Url(
            crypto.createHash("sha256")
                .update(arweave.utils.b64UrlToBuffer(this.config.wallet.n))
                .digest());
    }
    public async getBundlerAddress() {
        let res = await this.API.get("/info");
        return res.data.address;
    }
    private checkAndThrow(res) {
        if (res.status != 200) {
            //console.log(Object.keys(res));
            throw new Error(`error: ${res.status} ${JSON.stringify(res.data)}`);
        }
        return;
    }
}