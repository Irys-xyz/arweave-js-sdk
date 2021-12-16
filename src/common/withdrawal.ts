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
    console.log("preparing to sign");
    data.signature = await c.sign(deephash)
    console.log("Signed data");
    const isValid = await c.verify(data.publicKey, deephash, data.signature)
    console.log("pk, sig, dh")
    console.log(data.publicKey);
    console.log(data.signature);
    console.log(deephash);
    console.log(`request is valid? : ${isValid}`)
    data.publicKey = base64url.encode(data.publicKey)
    data.signature = base64url.encode(Buffer.from(data.signature))
    console.log(JSON.stringify(data));
    return api.post("/account/withdraw", data);
}
