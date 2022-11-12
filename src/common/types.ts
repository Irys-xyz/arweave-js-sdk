import BigNumber from "bignumber.js";
import { Signer } from "./signing";
import { DataItem } from "arbundles";
// common types shared between web and node versions

export interface CreateTxData { amount: BigNumber.Value, to: string, fee?: string; }

export interface Tx {
    from: string | undefined;
    to: string | undefined;
    amount: BigNumber;
    blockHeight?: BigNumber;
    pending: boolean;
    confirmed: boolean;
}
export interface CurrencyConfig { name: string, ticker: string, minConfirm?: number, wallet?: string | Object, providerUrl: string, isSlow?: boolean, opts?: any; }

export interface Currency {
    isSlow: boolean;
    needsFee: boolean;

    base: [string, number];

    name: string;

    minConfirm: number;

    get address(): string;

    ticker: string;

    getTx(txId: string): Promise<Tx>;

    ownerToAddress(owner: any): string;

    getId(item: DataItem): Promise<string>;

    price(): Promise<number>;

    sign(data: Uint8Array): Promise<Uint8Array>;

    getSigner(): Signer;

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

    getCurrentHeight(): Promise<BigNumber>;

    getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber | object>;

    sendTx(data: any): Promise<string | undefined>;

    createTx(amount: BigNumber.Value, to: string, fee?: string | object): Promise<{ txId: string | undefined, tx: any; }>;

    getPublicKey(): Promise<string | Buffer> | (string | Buffer);

    ready?(): Promise<void>;

    // createMultiSigTx?(amount: BigNumber.Value, to: string, opts: any, fee?: string): Promise<any>;

    // addSignature?(multiTx: any, opts: any): Promise<any>;

    // submitMultiSigTx?(multiTx: any, opts: any): Promise<any>;
}


export interface Manifest {
    manifest: string,
    version: string,
    paths: Record<string, Record<string, Record<"id", string>>>,
    index?: Record<"path", string>;
}


export interface UploadResponse {
    id: string,
    public: string,
    signature: string,
    block: number,
    validatorSignatures: { address: string, signature: string; }[];
}

export interface FundResponse {
    reward: string,
    target: string,
    quantity: string,
    id: string;
}
export interface WithdrawalResponse {
    tx_id: string;
    requested: number;
    fee: number,
    final: number;
}

export interface Withdrawal {
    publicKey: string | Buffer,
    currency: string,
    amount: string,
    nonce: number,
    signature: Buffer | string,
    sigType: number;
}

// // TS doesn't like string template literals it seems
// export enum manifestType {
//     paths = "arweave/paths"
// }

export interface BundlrConfig {
    timeout?: number,
    providerUrl?: string,
    contractAddress?: string,
    minConfirm?: number,
    signingFunction?: (msg: Uint8Array) => Promise<Uint8Array>,
    collectSignatures?: (msg: Uint8Array) => Promise<{ signatures: string[], bitmap: number[]; }>;
}
