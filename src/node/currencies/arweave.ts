import Arweave from "arweave";
import crypto from "crypto";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import { currencies } from "./index";
import { ArweaveSigner, Signer } from "arbundles/src/signing";
import { Tx } from "../../common/types";




async function createArweave(): Promise<Arweave> {
    const gateway = currencies["arweave"].provider;
    return Arweave.init({ host: gateway, protocol: "https", port: 443 });
}

export async function arweaveGetTx(txId): Promise<Tx> {
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

export function arweaveOwnerToAddress(owner): string {

    return Arweave.utils.bufferTob64Url(crypto
        .createHash("sha256")
        .update((Arweave.utils.b64UrlToBuffer((Buffer.isBuffer(owner) ? base64url(owner) : owner))))
        .digest()
    );

}

export async function arweaveGetId(item): Promise<string> {
    return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
}

export async function arweaveSign(data): Promise<Uint8Array> {
    return Arweave.crypto.sign(currencies["arweave"].account.key, data);
}

export function arweaveGetSigner(): Signer {
    return new ArweaveSigner(currencies["arweave"].account.key);
}

export async function arweaveVerify(pub, data, sig): Promise<boolean> {
    return Arweave.crypto.verify(pub, data, sig);
}

export async function arweaveGetCurrentHeight(): Promise<BigNumber> {
    const arweave = await createArweave();
    return arweave.network.getInfo().then(r => new BigNumber(r.height))
}

export async function arweaveGetFee(amount, to): Promise<BigNumber> {
    const arweave = await createArweave();
    return new BigNumber(parseInt(await arweave.transactions.getPrice(amount as number, to)))
}

export async function arweaveSendTx(tx): Promise<{
    status: number;
    statusText: string;
    data: any;
}> {
    const arweave = await createArweave();
    return await arweave.transactions.post(tx)

}

export async function arweaveCreateTx(amount, to, fee): Promise<{ txId: string, tx: any }> {
    const arweave = await createArweave();
    const key = currencies["arweave"].account.key;
    const tx = await arweave.createTransaction({ quantity: amount.toString(), reward: fee, target: to }, key)
    await arweave.transactions.sign(tx, key)
    return { txId: tx.id, tx };
}

export function arweaveGetPublicKey(): Buffer {
    return base64url.toBuffer(currencies["arweave"].account.key.n);
}
