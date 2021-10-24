import arweave from "arweave";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
//import { jwkTopem } from "arweave/node/lib/crypto/pem";

interface data {
    publicKey: string,
    currency: string,
    amount: number,
    nonce: number,
    signature: Uint8Array
}

/**
 * Create and send a withdrawl request 
 * @param utils Instance of Utils 
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
export async function withdrawBalance(utils: Utils, api: Api, wallet: JWKInterface, amount: number): Promise<AxiosResponse> {
    const publicKey: string = wallet.n
    //todo: make util functions directly return data rather than having to post-return mutate
    const data = { publicKey, currency: "arweave", amount, nonce: await utils.getNonce() } as data;
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    data.signature = await arweave.crypto.sign(wallet, deephash);

    return api.post("/account/withdraw", data);
}
