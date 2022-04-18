import { InjectedEthereumSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseWebCurrency from "../currency";
import { getAddress } from "@harmony-js/crypto";

import keccak256 from "keccak256";
import { ethers } from "ethers";
const ethBigNumber = ethers.BigNumber; // required for hexString conversions (w/ 0x padding)
const ethereumSigner = InjectedEthereumSigner;
import { ApiHarmonyProvider } from "harmony-ethers-sdk";
// import {
//     numberToHex,
// } from "@harmony-js/utils";

export default class HarmonyConfig extends BaseWebCurrency {
    private signer: InjectedEthereumSigner;
    protected wallet: ethers.providers.Web3Provider;
    // private w3signer: ethers.providers.JsonRpcSigner;
    private w3signer;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["One", 1e6];
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = this.providerInstance;
        const status = await provider.getTransactionReceipt(txId);
        const transaction = await provider.getTransaction(txId);
        const tx = {
            from: getAddress(transaction.from).basicHex,
            to: transaction.to,
            amount: new BigNumber(transaction.value.toNumber()),
            blockHeight: new BigNumber(transaction.blockNumber),
            pending: status.status === 0,
            confirmed: status.status === 1
        };
        return tx;
    }

    ownerToAddress(owner: any): string {
        return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = await this.getSigner();
        return signer.sign(data);
    }

    getSigner(): Signer {
        if (!this.signer) {
            this.signer = new InjectedEthereumSigner(this.wallet);
        }
        return this.signer
    }


    async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return ethereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        return new BigNumber(await this.providerInstance.getBlockNumber());
    }

    async getFee(): Promise<BigNumber> {
        return new BigNumber("630000000000000");
    }

    async sendTx(data: any): Promise<string> {
        const signer = this.w3signer
        const receipt = await signer.sendTransaction(data)// .catch((e) => { console.error(`Sending tx: ${e}`) })
        return receipt ? receipt.hash : undefined
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const amountc = ethBigNumber.from((new BigNumber(amount)).toString())

        const txn = await this.w3signer;
        const estimatedGas = await txn.estimateGas({ to, value: amountc.toHexString() })
        const gasPrice = await txn.getGasPrice();
        const signedTx = txn.populateTransaction(
        {
            to: getAddress(to).basicHex,
            value: ethBigNumber.from((new BigNumber(amount)).toString()).toHexString(),
            gasPrice: gasPrice,
            gasLimit: estimatedGas,
        });
        
        return { tx: signedTx, txId: null };
    }

    public async getPublicKey(): Promise<string | Buffer> {
        const signer = await this.getSigner() as InjectedEthereumSigner
        await signer.setPublicKey();
        return signer.publicKey;
    }

    pruneBalanceTransactions(_txIds: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async ready(): Promise<void> {
        this.w3signer = await this.wallet.getSigner();
        this._address = this.ownerToAddress(await this.getPublicKey());
        this.providerInstance = new ApiHarmonyProvider(this.providerUrl);
        // this.providerInstance = new ethers.providers.JsonRpcProvider(this.providerUrl);
        // await this.providerInstance.ready();
    }


}
