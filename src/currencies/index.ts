import redstone from "redstone-api";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import Arweave from "arweave";
import { FileDataItem } from "arbundles/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import keys from "../../keys";
import { getPolygonTx, polygonGetHeight, polygonOwnerToAddress, polygonSign, polygonVerify } from "./matic";


let arweave;

export interface Tx {
    from: string;
    amount: BigNumber;
    blockHeight?: BigNumber;
    pending: boolean;
}

interface Currency {
    base: [string, number];
    account: { key: any, address: string };
    provider?: string;

    getTx(txId: string): Promise<Tx>;

    ownerToAddress(owner: any): Promise<string>;

    getId(item: FileDataItem): Promise<string>;

    price(): Promise<number>;

    sign(key: any, data: Uint8Array): Promise<Uint8Array>;

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

    getCurrentHeight(): Promise<BigNumber>;

    getReward(amount: number): Promise<BigNumber>;

    sendTx(data: any): Promise<any>; //TODO: make signature(s) more specific

    createTx(data: any, key: any): Promise<any>;
}

interface CurrencyConfig {
    [key: string]: Currency;
}

export const currencies: CurrencyConfig = {
    // "arweave": keys.arweave ? {
    //     base: ["winston", 1e12],
    //     account: { key: keys.arweave.key, address: keys.arweave.address },
    //     getTx: null,
    //     ownerToAddress: async (owner) => {
    //         return arweave.wallets.ownerToAddress(Buffer.isBuffer(owner) ? base64url(owner) : owner);
    //     },
    //     getId: async (item) => {
    //         return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
    //     },
    //     price: () => getRedstonePrice("AR"),
    //     sign: async (data) => {
    //         return Arweave.crypto.sign(currencies["arweave"].account.key, data);
    //     },
    //     verify: async (pub, data, sig) => {
    //         return Arweave.crypto.verify(pub, data, sig);
    //     },
    //     getCurrentHeight: async () => arweave.network.getInfo().then(r => new BigNumber(r.height)),
    //     getReward: async (amount) => { return new BigNumber(parseInt(await arweave.transactions.getPrice(amount)) * await currentMultiplier()) },
    //     sendTx: async (tx) => {
    //         return await arweave.transactions.post(tx);
    //     },
    //     createTx: async (data, key) => {
    //         const tx = await arweave.createTransaction({ ...data }, key)
    //         await arweave.transactions.sign(tx, key)
    //         return tx;
    //     }
    // } : undefined,
    "arweave": keys.arweave ? {
        base: ["winston", 1e12],
        account: { key: keys.arweave.key, address: keys.arweave.address },
        getTx: null,
        ownerToAddress: async (owner) => {
            return arweave.wallets.ownerToAddress(Buffer.isBuffer(owner) ? base64url(owner) : owner);
        },
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        price: () => getRedstonePrice("AR"),
        sign: async (data) => {
            return Arweave.crypto.sign(currencies["arweave"].account.key, data);
        },
        verify: async (pub, data, sig) => {
            return Arweave.crypto.verify(pub, data, sig);
        },
        getCurrentHeight: async () => arweave.network.getInfo().then(r => new BigNumber(r.height)),
        getReward: async (amount) => { return new BigNumber(parseInt(await arweave.transactions.getPrice(amount)) * await currentMultiplier()) },
        sendTx: async (tx) => {
            return await arweave.transactions.post(tx);
        },
        createTx: async (data, key) => {
            const tx = await arweave.createTransaction({ ...data }, key)
            await arweave.transactions.sign(tx, key)
            return tx;
        }
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
        base: ["submatic", 1e18],
        account: { key: keys.matic.key, address: keys.matic.address },
        provider: "https://polygon-mainnet.g.alchemy.com/v2/ZiotE6a9elf9uLOTwDOuI5vyEaNk9T1F",
        getTx: getPolygonTx,
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        ownerToAddress: polygonOwnerToAddress,
        price: () => getRedstonePrice("MATIC"),
        sign: polygonSign,
        verify: polygonVerify,
        getCurrentHeight: polygonGetHeight,
        getReward: undefined,
        sendTx: undefined,
        createTx: undefined
    } : undefined,
};

export async function loadCurrencyFile(currency) {
    return;
}

export async function getRedstonePrice(currency: string): Promise<number> {
    return (await redstone.getPrice(currency)).value;
}


// /**
//  * Returns the ratio between currency2 base units and currency1 base units based on their USD price.
//  * @param currency1 - the currency you want to compare (relative)
//  * @param currency2  - the currency you are basing the comparison on (base)
//  */
// export async function getConversionRatio(currency1: string, currency2: string): Promise<BigNumber> {
//     const c1 = currencies[currency1];
//     const c2 = currencies[currency2];
//     // get the bup (base unit price) in USD
//     const c1bup = new BigNumber(await c1.price()).div(c1.base[1]); // 1 base unit
//     const c2bup = new BigNumber(await c2.price()).div(c2.base[1]);
//     // get the ratio of c1 to c2
//     const ratio = c1bup.div(c2bup);
//     logger.debug(`1 ${c1.base[0]} is ${ratio.toString()} ${c2.base[0]} ($${c1bup.toString()})`);
//     return ratio;
// }




