import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import Utils from "./utils";
import BigNumber from "bignumber.js";
import Api from "./api";
import base64url from "base64url";
import { WithdrawalResponse } from "./types";


/**
 * Create and send a withdrawal request 
 * @param utils Instance of Utils 
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
export async function withdrawBalance(utils: Utils, api: Api, amount: BigNumber.Value): Promise<WithdrawalResponse> {
    const c = utils.currencyConfig;
    const pkey = await c.getPublicKey();
    const data = { publicKey: pkey, currency: utils.currency, amount: new BigNumber(amount).toString(), nonce: await utils.getNonce(), signature: "", sigType: c.getSigner().signatureType };
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    if (!Buffer.isBuffer(data.publicKey)) {
        data.publicKey = Buffer.from(data.publicKey);
    }

    const signature = await c.sign(deephash);
    const isValid = await c.verify(data.publicKey, deephash, signature);

    data.publicKey = base64url.encode(data.publicKey);
    data.signature = base64url.encode(Buffer.from(signature));

    const cpk = base64url.toBuffer(data.publicKey);
    const csig = base64url.toBuffer(data.signature);

    // should match opk and csig
    const dh2 = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);

    const isValid2 = await c.verify(cpk, dh2, csig);
    const isValid3 = c.ownerToAddress(c.name == "arweave" ? base64url.decode(data.publicKey) : base64url.toBuffer(data.publicKey)) === c.address;

    if (!(isValid || isValid2 || isValid3)) { throw new Error(`Internal withdrawal validation failed - please report this!\nDebug Info:${JSON.stringify(data)}`); }

    const res = await api.post("/account/withdraw", data);
    Utils.checkAndThrow(res, "Withdrawing balance");
    return res.data;
}
