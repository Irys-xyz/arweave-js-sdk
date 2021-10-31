/* eslint-disable @typescript-eslint/no-unused-vars */
import PolygonSigner from "arbundles/build/signing/chains/PolygonSigner";
import { Tx } from ".";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { publicKeyCreate } from "secp256k1";
import { Currency } from ".";
import { FileDataItem } from "arbundles/file";

class CurrencyMatic implements Currency {
    public provider = "https://polygon-mainnet.g.alchemy.com/v2/ZiotE6a9elf9uLOTwDOuI5vyEaNk9T1F";
    public base
    public account;
    constructor(account) {
        this.account = account
        this.base = ["submatic", 1e18];
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = new ethers.providers.JsonRpcProvider(this.provider);
        const response = await provider.send("eth_getTransactionByHash", [txId]);
        if (!response) throw new Error("Tx doesn't exist");
        return {
            from: response.from,
            blockHeight: response.blockNumber,
            amount: new BigNumber(response.value, 16),
            pending: !response.blockHash
        };
    }
    async ownerToAddress(owner: any): Promise<string> {
        return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
    }
    getId(item: FileDataItem): Promise<string> {
        throw new Error("Method not implemented.");
    }
    price(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    async sign(key: any, data: Uint8Array): Promise<Uint8Array> {
        const signer = new PolygonSigner(key);
        return signer.sign(data);
    }
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return PolygonSigner.verify(pub, data, signature);
    }
    async getCurrentHeight(): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(this.provider);
        const response = await provider.send("eth_blockNumber", []);
        return new BigNumber(response, 16);
    }
    getReward(amount: number): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    sendTx(data: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    createTx(data: any, key: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getPublicKey(key: any): string {
        return Buffer.from(publicKeyCreate(Buffer.from(key, "hex"), false)).toString();
    }

}
export default CurrencyMatic;

