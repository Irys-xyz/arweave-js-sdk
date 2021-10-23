import arweave from "arweave";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from "axios";
//import { jwkTopem } from "arweave/node/lib/crypto/pem";

interface data {
    publicKey: string,
    currency: string,
    amount: number,
    nonce: number,
    signature: Uint8Array
}



export async function withdrawBalance(utils, api, wallet, amount): Promise<AxiosResponse> {
    const publicKey: string = wallet.n
    //todo: make util functions directly return data rather than having to post-return mutate
    const data = { publicKey, currency: "arweave", amount, nonce: await utils.getNonce() } as data;
    const deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    data.signature = await arweave.crypto.sign(wallet, deephash);

    return api.post("/account/withdraw", data);
}
