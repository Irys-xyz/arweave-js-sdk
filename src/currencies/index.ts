import redstone from "redstone-api";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import Arweave from "arweave";
import { FileDataItem } from "arbundles/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import crypto from "crypto"

import { arweave, keys } from "../bundlr";


import {
    createMaticTx,
    getMaticFee,
    getPolygonTx,
    getPublicKey,
    polygonGetHeight,
    polygonGetSigner,
    polygonOwnerToAddress,
    polygonSign,
    polygonVerify, sendMaticTx,
} from "./matic";
import { bufferTob64Url, b64UrlToBuffer } from "arweave/node/lib/utils";
import { ArweaveSigner, Signer } from "arbundles/build/signing";

export interface Tx {
    from: string;
    to: string;
    amount: BigNumber;
    blockHeight?: BigNumber;
    pending: boolean;
    confirmed: boolean
}

export interface CreateTxData { amount: BigNumber | number, to: string, fee?: string };

export interface Currency {
    base: [string, number];
    account: { key: any, address: string };
    provider?: string;

    getTx(txId: string): Promise<Tx>;

    ownerToAddress(owner: any): string;

    getId(item: FileDataItem): Promise<string>;

    price(): Promise<number>;

    sign(data: Uint8Array): Promise<Uint8Array>;

    getSigner(): Promise<Signer>;

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

    getCurrentHeight(): Promise<BigNumber>;

    getFee(amount: BigNumber | number, to?: string): Promise<BigNumber>;

    sendTx(data: any): Promise<any>; //TODO: make signature(s) more specific

    createTx(data: CreateTxData, key: any): Promise<{ txId: string, tx: any }>;

    getPublicKey(): string | Buffer;
}

interface CurrencyConfig {
    [key: string]: Currency;
}

export const currencies: CurrencyConfig = {
    "arweave": keys.arweave ? {
        base: ["winston", 1e12],
        account: { key: keys.arweave.key, address: keys.arweave.address },
        getTx: null,
        ownerToAddress: (owner) => {
            return bufferTob64Url(crypto.createHash("sha256").update(b64UrlToBuffer(Buffer.isBuffer(owner) ? base64url(owner) : owner)).digest())
        },
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        price: () => getRedstonePrice("AR"),
        sign: async (data) => {
            return Arweave.crypto.sign(currencies["arweave"].account.key, data);
        },
        getSigner: async () => {
            return new ArweaveSigner(currencies["arweave"].account.key);
        },
        verify: async (pub, data, sig) => {
            return Arweave.crypto.verify(pub, data, sig);
        },
        getCurrentHeight: async () => arweave.network.getInfo().then(r => new BigNumber(r.height)),
        getFee: async (_amount, to) => { return new BigNumber(parseInt(await arweave.transactions.getPrice(0, to))) },
        sendTx: async (tx) => {
            return await arweave.transactions.post(tx);
        },
        createTx: async ({ amount, fee, to }, key) => {
            const tx = await arweave.createTransaction({ quantity: amount.toString(), reward: fee, target: to }, key)
            await arweave.transactions.sign(tx, key)
            return { txId: tx.id, tx };
        },
        getPublicKey: () => { return currencies["arweave"].account.key.n },

    } : undefined,
    // "solana": {
    //     base: ["lamport", 1000000000],
    //     account: { address: "aaaaa" },
    //     getTx: async () => { return 0 },
    //     ownerToAddress: () => { return 0 },
    //     price: getRedstonePrice("SOL"),
    //     sign: async (k, d) => { return [k, d] },
    //     verify: async (k, d, s) => { return [k, d, s] }
    // },
    "matic": keys.matic ? {
        base: ["wei", 1e18],
        account: { key: keys.matic.key, address: keys.matic.address },
        provider: "https://polygon-rpc.com",
        getTx: getPolygonTx,
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        ownerToAddress: polygonOwnerToAddress,
        price: () => getRedstonePrice("MATIC"),
        sign: polygonSign,
        getSigner: polygonGetSigner,
        verify: polygonVerify,
        getCurrentHeight: polygonGetHeight,
        getFee: getMaticFee,
        sendTx: sendMaticTx,
        createTx: createMaticTx,
        getPublicKey: getPublicKey
    } : undefined,
};

export async function getRedstonePrice(currency: string): Promise<number> {
    return (await redstone.getPrice(currency)).value;
}


/**
 * Returns the ratio between currency2 base units and currency1 base units based on their USD price.
 * @param currency1 - the currency you want to compare (relative)
 * @param currency2  - the currency you are basing the comparison on (base)
 */
export async function getConversionRatio(currency1: string, currency2: string): Promise<BigNumber> {
    const c1 = currencies[currency1];
    const c2 = currencies[currency2];
    // get the bup (base unit price) in USD
    const c1bup = new BigNumber(await c1.price()).div(c1.base[1]); // 1 base unit
    const c2bup = new BigNumber(await c2.price()).div(c2.base[1]);
    // get the ratio of c1 to c2
    const ratio = c1bup.div(c2bup);
    console.debug(`1 ${c1.base[0]} is ${ratio.toString()} ${c2.base[0]} ($${c1bup.toString()})`);
    return ratio;
}




