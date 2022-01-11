import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"
import { KeyPair, connect, Near } from "near-api-js"
// export interface NearCurrencyConfig extends CurrencyConfig {
//     networkId: string
//     headers: [key: string]: string | number;
// }

export default class NearConfig extends BaseNodeCurrency {
    protected keyStore: KeyPair
    protected keyPair: KeyPair
    protected providerInstance?: Near

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["yoctoNEAR", 1e25]
        this.keyPair = KeyPair.fromString(this.wallet)
    }

    protected async getProvider(): Promise<Near> {
        if (!this.providerInstance) {
            this.providerInstance = await connect({ nodeUrl: this.providerUrl, networkId: this.providerUrl == "https://rpc.mainnet.near.org" ? "mainnet" : "testnet", headers: {} })
        }
        return this.providerInstance;
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
    getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    sendTx(_data: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    createTx(_amount: BigNumber.Value, _to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        throw new Error("Method not implemented.");
    }
    getPublicKey(): string | Buffer {
        throw new Error("Method not implemented.");
    }


}