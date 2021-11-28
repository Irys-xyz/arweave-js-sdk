import redstone from "redstone-api";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import Arweave from "arweave";
import { FileDataItem } from "arbundles/file";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { keys } from "../bundlr";
import { maticCreateTx, maticGetFee, maticGetHeight, maticGetPublicKey, maticGetSigner, maticGetTx, maticOwnerToAddress, maticSendTx, maticSign, maticVerify } from "./matic";
import { Signer } from "arbundles/build/signing";
import { solanaCreateTx, solanaGetCurrentHeight, solanaGetFee, solanaGetPublicKey, solanaGetSigner, solanaGetTx, solanaOwnerToAddress, solanaSendTx, solanaSign, solanaVerify } from "./solana";
import { arweaveCreateTx, arweaveGetCurrentHeight, arweaveGetFee, arweaveGetId, arweaveGetPublicKey, arweaveGetSigner, arweaveGetTx, arweaveOwnerToAddress, arweaveSendTx, arweaveSign, arweaveVerify } from "./arweave";

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
    [key: string]: Currency;
}

export const currencies: CurrencyConfig = {
    "arweave": keys.arweave ? {
        base: ["winston", 1e12],
        account: { key: keys.arweave.key, address: keys.arweave.address },
        provider: "arweave.net",
        getTx: arweaveGetTx,
        ownerToAddress: arweaveOwnerToAddress,
        getId: arweaveGetId,
        price: () => getRedstonePrice("AR"),
        sign: arweaveSign,
        getSigner: arweaveGetSigner,
        verify: arweaveVerify,
        getCurrentHeight: arweaveGetCurrentHeight,
        getFee: arweaveGetFee,
        sendTx: arweaveSendTx,
        createTx: arweaveCreateTx,
        getPublicKey: arweaveGetPublicKey
    } : undefined,
    "matic": keys.matic ? {
        base: ["wei", 1e18],
        account: { key: keys.matic.key, address: keys.matic.address },
        provider: "https://polygon-rpc.com",
        getTx: maticGetTx,
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        ownerToAddress: maticOwnerToAddress,
        price: () => getRedstonePrice("MATIC"),
        sign: maticSign,
        getSigner: maticGetSigner,
        verify: maticVerify,
        getCurrentHeight: maticGetHeight,
        getFee: maticGetFee,
        sendTx: maticSendTx,
        createTx: maticCreateTx,
        getPublicKey: maticGetPublicKey
    } : undefined,
    "solana": keys.solana ? {
        base: ["lamports", 1_000_000_000], // 1e9
        account: { key: keys.solana.key, address: keys.solana.address },
        provider: "mainnet-beta",
        //provider: "devnet",
        getTx: solanaGetTx,
        getId: async (item) => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        ownerToAddress: solanaOwnerToAddress,
        price: () => getRedstonePrice("SOL"),
        sign: solanaSign,
        getSigner: solanaGetSigner,
        verify: solanaVerify,
        getCurrentHeight: solanaGetCurrentHeight,
        getFee: solanaGetFee,
        sendTx: solanaSendTx,
        createTx: solanaCreateTx,
        getPublicKey: solanaGetPublicKey,
    } : undefined,
};

export async function getRedstonePrice(currency: string): Promise<number> {
    return (await redstone.getPrice(currency)).value;
}
