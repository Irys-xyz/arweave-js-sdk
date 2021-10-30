import arweave from "arweave";
import Api from "arweave/node/lib/api";
import crypto from "crypto";
import { JWKInterface } from "arweave/node/lib/wallet";
import { AxiosResponse } from "axios";


export default class Utils {
    private api: Api;
    private config: { address: string, wallet: JWKInterface };

    constructor(api: Api, config: { address: string, wallet: JWKInterface }) {
        this.api = api;
        this.config = config;
    };

    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param res an axios response
     * @returns nothing if the status code is 200
     */
    private static checkAndThrow(res: AxiosResponse) {
        if (res.status != 200) {
            throw new Error(`Error: ${res.status} ${JSON.stringify(res.data)}`);
        }
        return;
    }

    /**
     * Gets the nonce used for withdrawl request validation from the bundler
     * @returns nonce for the current user
     */
    public async getNonce(): Promise<number> {
        const res = await this.api.get(`/account/withdrawals?address=${this.config.address}`);
        Utils.checkAndThrow(res);
        return (res).data;

    }
    /**
     * Gets the balance on the current bundler for the specified user
     * @param address the user's address to query
     * @returns the balance in winston
     */
    public async getBalance(address: string): Promise<number> {
        const res = await this.api.get(`/account/balance?address=${address}`);
        Utils.checkAndThrow(res);
        return res.data.balance;
    }
    /**
     * Gets the Arweave address of the loaded walletfile
     * @returns Arweave address
     */
    public getAddress(): string {
        return arweave.utils.bufferTob64Url(
            crypto.createHash("sha256")
                .update(arweave.utils.b64UrlToBuffer(this.config.wallet.n))
                .digest());
    }
    /**
     * Queries the bundler to get it's Arweave address
     * @returns the bundler's Arweave address
     */
    public async getBundlerAddress(currency: string): Promise<string> {
        const res = await this.api.get("/info");
        return res.data.addresses[currency];
    }
}
