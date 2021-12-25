import { FileDataItem } from "arbundles/file";
import { Signer } from "arbundles/src/signing";
import Arweave from "arweave";
import base64url from "base64url";
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig, Currency } from "./types"
import redstone from "redstone-api";

export default abstract class BaseCurrency implements Currency {
    public base: [string, number];
    protected wallet: any
    protected _address: string
    protected provider?: any;
    protected providerInstance?: any
    protected ticker: string;
    protected name: string;
    protected minConfirm: number

    constructor(config: CurrencyConfig) {
        Object.assign(this, config);
    }

    // common methods

    get address(): string {
        return this._address
    }

    public async ready(): Promise<void> {
        this._address = this.ownerToAddress(await this.getPublicKey());
    }

    async getId(item: FileDataItem): Promise<string> {
        return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
    }

    async price(): Promise<number> {
        return getRedstonePrice(this.ticker);
    }

    getTx(_txId: string): Promise<Tx> {
        throw new Error("Method not implemented.");
    }
    ownerToAddress(_owner: any): string {
        throw new Error("Method not implemented.");
    }
    sign(_data: Uint8Array): Promise<Uint8Array> {
        throw new Error("Method not implemented.");
    }
    getSigner(): Signer {
        throw new Error("Method not implemented.");
    }
    verify(_pub: any, _data: Uint8Array, _signature: Uint8Array): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getCurrentHeight(): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    getFee(_amount: number | BigNumber, _to?: string): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    sendTx(_data: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    createTx(_amount: number | BigNumber, _to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        throw new Error("Method not implemented.");
    }
    getPublicKey(): Promise<string | Buffer> {
        throw new Error("Method not implemented.");
    }
}

export async function getRedstonePrice(currency: string): Promise<number> {
    return (await redstone.getPrice(currency)).value;
}
