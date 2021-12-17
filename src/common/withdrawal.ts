import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import BigNumber from "bignumber.js";
import Api from "./api";
import base64url from "base64url";

// interface data {
//     publicKey: string | Buffer,
//     currency: string,
//     amount: string,
//     nonce: number,
//     signature: Buffer | Uint8Array
// }

/**
 * Create and send a withdrawl request 
 * @param utils Instance of Utils 
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
export async function withdrawBalance(utils: Utils, api: Api, amount: BigNumber): Promise<AxiosResponse> {
    const c = utils.currencyConfig;
    const data = { publicKey: await c.getPublicKey(), currency: utils.currency, amount: amount.toString(), nonce: await utils.getNonce(), signature: undefined }
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);

    data.signature = await c.sign(deephash)

    if (! await c.verify(data.publicKey, deephash, data.signature)) { throw new Error("Internal withdrawal validation failed") }

    data.publicKey = base64url.encode(data.publicKey)
    data.signature = base64url.encode(Buffer.from(data.signature))

    return api.post("/account/withdraw", data);
}
