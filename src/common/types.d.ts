import BigNumber from "bignumber.js";
// common types shared between web and node versions

export interface CreateTxData { amount: BigNumber | number, to: string, fee?: string };
export interface Tx {
    from: string;
    to: string;
    amount: BigNumber;
    blockHeight?: BigNumber;
    pending: boolean;
    confirmed: boolean
}
export interface CurrencyConfig { name: string, ticker: string, minConfirm: number, wallet, provider?: any }


export interface Currency {
    base: [string, number];

    get address(): string;

    ready(): Promise<void>

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

    getPublicKey(): Promise<string | Buffer>;

}
