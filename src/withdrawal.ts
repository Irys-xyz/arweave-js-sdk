import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "arweave/node/lib/api";
import BigNumber from "bignumber.js";
import base64url from 'base64url';

interface WithdrawData {
    publicKey: string,
    currency: string,
    amount: string,
    nonce: number,
    signature: string;
}

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

    const nonce = await utils.getNonce();

    const deephash = await deepHash([stringToBuffer(utils.currency), stringToBuffer(amount.toString(10)), stringToBuffer(nonce.toString())]);

    const signature = await c.sign(deephash);

    const data: WithdrawData = {
        publicKey: base64url(await c.getPublicKey()),
        currency: utils.currency,
        amount: amount.toString(10),
        nonce,
        signature: base64url(Buffer.from(signature))
    }

    return api.post("/account/withdraw", data);
}
