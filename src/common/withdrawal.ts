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
    const pkey = await c.getPublicKey();
    const data = { publicKey: pkey, currency: utils.currency, amount: amount.toString(), nonce: await utils.getNonce(), signature: undefined }
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    if (!Buffer.isBuffer(data.publicKey)) {
        data.publicKey = Buffer.from(data.publicKey);
    }

    const a = data.publicKey.toString(); //fine
    console.log(a)

    data.signature = await c.sign(deephash)

    const isValid = await c.verify(data.publicKey, deephash, data.signature)

    // const opk = Buffer.from(data.publicKey)
    // const osig = data.signature; // (uint8array)

    data.publicKey = base64url.encode(data.publicKey)
    data.signature = base64url.encode(data.signature)

    const b = base64url.decode(data.publicKey)
    console.log(b) //fine

    const cpk = base64url.toBuffer(data.publicKey)
    const csig = base64url.toBuffer(data.signature)
    // should match opk and csig
    const DH2 = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())])
    // console.log(cpk.equals(opk));
    // console.log(csig.equals(osig))
    //TODO: remove check once paranoia is gone
    const isValid2 = await c.verify(cpk, DH2, csig)
    // console.log({ opk, osig })
    console.log(isValid2)
    console.log(isValid)
    if (!(isValid || isValid2)) { throw new Error(`Internal withdrawal validation failed - please report this!\nDebug Info:${JSON.stringify(data)}`) }
    console.log(JSON.stringify({
        ...data,
        publicKey: base64url.toBuffer(data.publicKey),
        signature: base64url.toBuffer(data.signature)
    }))
    console.log(c.ownerToAddress(base64url.decode(data.publicKey)))
    return api.post("/account/withdraw", data);
}
