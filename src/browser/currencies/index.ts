import redstone from "redstone-api";
import BigNumber from "bignumber.js";
import { FileDataItem } from "arbundles/file";

import { keys } from "../bundlr";
import { Signer } from "arbundles/src/signing";
import { ethConfigFactory } from "./ethereum";


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

    getSigner(): Signer;

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

    getCurrentHeight(): Promise<BigNumber>;

    getFee(amount: BigNumber | number, to?: string): Promise<BigNumber>;

    sendTx(data: any): Promise<any>; //TODO: make signature(s) more specific

    createTx(amount: BigNumber | number, to: string, fee?: string): Promise<{ txId: string, tx: any }>;

    getPublicKey(): string | Buffer;
}

interface CurrencyConfig {
    [key: string]: any;
}

export const currencies: CurrencyConfig = {
    // "ethereum": keys.ethereum
    //     ? ethConfigFactory({ name: "ethereum", ticker: "ETH", minConfirm: 5, account: keys.ethereum })
    //     : undefined,
    // "matic": keys.matic
    //     ? ethConfigFactory({ name: "matic", ticker: "MATIC", providerUrl: "https://polygon-rpc.com", minConfirm: 5, account: keys.matic })
    //     : undefined,
    "matic": keys.matic
        ? ethConfigFactory({ name: "matic", ticker: "MATIC", minConfirm: 5, account: keys.matic, providerUrl: "https://polygon-rpc.com" })
        : undefined
};

export async function getRedstonePrice(currency: string): Promise<number> {
    return (await redstone.getPrice(currency)).value;
}
