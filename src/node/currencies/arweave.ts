import Arweave from "arweave";
//import { arweave } from "../bundlr";
import crypto from "crypto";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import { currencies } from "./index";
import { ArweaveSigner } from "arbundles/src/signing";




async function createArweave() {
    const gateway = currencies["arweave"].provider;
    return Arweave.init({ host: gateway, protocol: "https", port: 443 });
}

export async function arweaveGetTx(txId) {
    const arweave = await createArweave();
    const txs = await arweave.transactions.getStatus(txId);
    let tx;
    if (txs.status == 200) {
        tx = await arweave.transactions.get(txId)
    }
    const confirmed = (txs.status !== 202 && txs.confirmed?.number_of_confirmations >= 20)
    let owner;
    if (tx?.owner) {
        owner = arweaveOwnerToAddress(tx.owner);
    }
    return {
        from: owner ?? undefined,
        to: tx?.target ?? undefined,
        amount: new BigNumber(tx?.quantity ?? 0),
        pending: (txs.status == 202),
        confirmed
    }
}

export function arweaveOwnerToAddress(owner) {

    return Arweave.utils.bufferTob64Url(crypto
        .createHash("sha256")
        .update((Arweave.utils.b64UrlToBuffer((Buffer.isBuffer(owner) ? base64url(owner) : owner))))
        .digest()
    );

}

export async function arweaveGetId(item) {
    return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
}

export async function arweaveSign(data) {
    return Arweave.crypto.sign(currencies["arweave"].account.key, data);
}

export function arweaveGetSigner() {
    return new ArweaveSigner(currencies["arweave"].account.key);
}

export async function arweaveVerify(pub, data, sig) {
    return Arweave.crypto.verify(pub, data, sig);
}

export async function arweaveGetCurrentHeight() {
    const arweave = await createArweave();
    return arweave.network.getInfo().then(r => new BigNumber(r.height))
}

export async function arweaveGetFee(amount, to) {
    const arweave = await createArweave();
    return new BigNumber(parseInt(await arweave.transactions.getPrice(amount as number, to)))
}

export async function arweaveSendTx(tx) {
    const arweave = await createArweave();
    return await arweave.transactions.post(tx)

}

export async function arweaveCreateTx(amount, to, fee) {
    const arweave = await createArweave();
    const key = currencies["arweave"].account.key;
    const tx = await arweave.createTransaction({ quantity: amount.toString(), reward: fee, target: to }, key)
    await arweave.transactions.sign(tx, key)
    return { txId: tx.id, tx };
}

export function arweaveGetPublicKey() {
    return base64url.toBuffer(currencies["arweave"].account.key.n);
}
