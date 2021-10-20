import arweave from "arweave";
import Api from "arweave/node/lib/api";
import crypto from "crypto";
import { JWKInterface } from "arweave/node/lib/wallet";


export default class Utils {
    private api: Api;
    private config: { address: string, wallet: JWKInterface };

    constructor(api: Api, config: { address: string, wallet: JWKInterface }) {
        this.api = api;
        this.config = config;
    };

    private static checkAndThrow(res) {
        if (res.status != 200) {
            throw new Error(`Error: ${res.status} ${JSON.stringify(res.data)}`);
        }
        return;
    }

    public async getNonce(): Promise<number> {
        const res = await this.api.get(`/account/withdrawls?address=${this.config.address}`);
        Utils.checkAndThrow(res);
        return (res).data;

    }

    public async getBalance(address: string): Promise<number> {
        const res = await this.api.get(`/account/balance?address=${address}`);
        Utils.checkAndThrow(res);
        return res.data.balance;
    }

    public getAddress(): string {
        return arweave.utils.bufferTob64Url(
            crypto.createHash("sha256")
                .update(arweave.utils.b64UrlToBuffer(this.config.wallet.n))
                .digest());
    }

    public async getBundlerAddress() {
        const res = await this.api.get("/info");
        return res.data.address;
    }
}
