import keccak256 from "keccak256";
import { publicKeyCreate } from "secp256k1";
import { ethers, Wallet } from "ethers";
import BigNumber from "bignumber.js";
import { signers } from "arbundles";
import { Signer } from "arbundles/src/signing";
import { JsonRpcProvider } from "@ethersproject/providers";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";

import * as zksync from "zksync";
import axios from "axios";

const ethereumSigner = signers.EthereumSigner;

export interface ZKsyncCurrencyConfig extends CurrencyConfig { ethProvider: string }

export default class ZKsyncConfig extends BaseNodeCurrency {
    protected providerEth;
    protected providerZksync;
    private ethProvider: string;

    constructor(config: ZKsyncCurrencyConfig) {
        super(config);
        this.base = ["wei", 1e18];
    }

    protected async getEthProvider(): Promise<JsonRpcProvider> {
        if (!this.providerEth) {
            this.providerEth = new ethers.providers.JsonRpcProvider(this.ethProvider);
            await this.providerEth.ready;
        }
        return this.providerEth;
    }

    protected async getZksyncProvider(): Promise<zksync.Provider> {
        if (!this.providerZksync) {
            this.providerZksync = await zksync.Provider.newHttpProvider(`${this.providerUrl}/jsrpc`);
        }
        return this.providerZksync;
    }

    async getTx(txId: string): Promise<Tx> {
        const endpoint = `${this.providerUrl}/api/v0.2/transactions/${txId}/data`;
        const response = await axios.get(endpoint);

        if (!response) throw new Error("Tx doesn't exist");

        const transaction = {
            from: response.data.result.tx.op.from,
            to: response.data.result.tx.op.to,
            blockHeight: new BigNumber(response.data.result.tx.blockNumber),
            amount: new BigNumber(response.data.result.tx.op.amount, 16),
            pending: false,
            confirmed: response.data.result.tx.status === "committed",
        };

        return transaction;
    }

    ownerToAddress(owner: any): string {
        return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = new ethereumSigner(this.wallet);
        return signer.sign(data);
    }

    getSigner(): Signer {
        return new ethereumSigner(this.wallet);
    }

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return ethereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const endpoint = `${this.providerUrl}/api/v0.2/networkStatus`;
        const response = await axios.get(endpoint);
        return new BigNumber(response.data.finalized, 16);
    }

    async getFee(_amount: BigNumber.Value, to: string): Promise<BigNumber> {
        const tx = {
            "txType": "Transfer",
            "address": to,
            "tokenLike": 1
        };

        const endpoint = `${this.providerUrl}/api/v0.2/fee`;
        const response = await axios.post(endpoint, tx);

        return new BigNumber(await response.data.result.totalFee);
    }


    async sendTx(data: any): Promise<any> {
        return (await (await this.getZksyncProvider()).submitTx(data.tx, data.ethereumSignature).catch(e => { console.error(`Error occurred while sending a tx - ${e}`); throw e }));
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const zkSyncProvider = await this.getZksyncProvider();
        
        const ethWallet = new Wallet(this.wallet, await this.getEthProvider());
        const zksyncWallet = await zksync.Wallet.fromEthSigner(ethWallet, zkSyncProvider);
        
        const nonce = await zksyncWallet.getNonce();

        const rawTx = {
            to: to,
            token: "ETH",
            amount: zksync.utils.closestPackableTransactionAmount(ethers.utils.parseUnits(amount.toString(),"wei")),
            fee: zksync.utils.closestPackableTransactionFee((await this.getFee(null, to)).toString()).toString().slice(0,-4),
            nonce: nonce
        };

        const signedTx = await zksyncWallet.signSyncTransfer(rawTx);
        return { txId: null, tx: signedTx };
    }

    getPublicKey(): string | Buffer {
        return Buffer.from(publicKeyCreate(Buffer.from(this.wallet, "hex"), false));
    }

    async ready(): Promise<boolean> {
        this.assignAddress();
        return true;
    }

}