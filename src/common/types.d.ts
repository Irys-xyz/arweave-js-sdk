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