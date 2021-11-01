// import arweave from "arweave";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "arweave/node/lib/api";
// import { JWKInterface } from "arweave/node/lib/wallet";
//import { jwkTopem } from "arweave/node/lib/crypto/pem";

interface data {
    publicKey: string,
    currency: string,
    amount: number,
    nonce: number,
    signature: Buffer
}

/**
 * Create and send a withdrawl request 
 * @param utils Instance of Utils 
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
export async function withdrawBalance(utils: Utils, api: Api, amount: number): Promise<AxiosResponse> {
    const c = utils.currencyConfig;
    // const publicKey: string = wallet.n
    // //todo: make util functions directly return data rather than having to post-return mutate
    const data = { publicKey: await c.getPublicKey(), currency: utils.currency, amount, nonce: await utils.getNonce() } as data;
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    data.signature = Buffer.from(await c.sign(deephash))
    const isValid = await c.verify(data.publicKey, deephash, Uint8Array.from(data.signature))
    console.log(isValid);
    console.log(c.ownerToAddress(data.publicKey));
    //console.log(Buffer.from())
    return api.post("/account/withdraw", data);
}
