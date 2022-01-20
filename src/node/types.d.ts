import { Currency } from "../common/types";

export interface NodeCurrency extends Currency {
    ownerToAddress(owner: any): Promise<string>
    getPublicKey(): Promise<string>
    // getPublicKey(): string | Buffer
}


