import { CosmosSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"

// import * as algosdk from "algosdk";
// import axios from "axios";
import * as stargate from "@cosmjs/stargate";
import * as signingcosmos from "@cosmjs/proto-signing";


export default class CosmosConfig extends BaseNodeCurrency {
    protected keyPair;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["uatom", 1e6]
        this.keyPair = signingcosmos.DirectSecp256k1HdWallet.fromMnemonic(this.wallet);
    }

    protected async getProvider(): Promise<any> {
        if (!this.providerInstance) {
            this.providerInstance = await stargate.SigningStargateClient.connectWithSigner(
                this.providerUrl,
                this.keyPair
              );
            await this.providerInstance.ready
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const transaction = await this.providerInstance.getTx(txId);
        const latestBlockHeight = new BigNumber(await this.getCurrentHeight()).toNumber();
        const tx: Tx = {
            from: transaction.from,
            to: transaction.to,
            amount: transaction.amount,
            blockHeight: new BigNumber(transaction.blockHeight),
            pending: false,
            confirmed: latestBlockHeight - transaction.blockHeight.toNumber() >= this.minConfirm
        };
        return tx;
        // throw "method not implemented"
        return transaction;
    }

    ownerToAddress(owner: any): string {
        const account = stargate.accountFromAny(owner)
        return account.address;
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return this.getSigner().sign(data)
    }

    getSigner(): Signer {
        return new CosmosSigner(this.keyPair.sk, this.getPublicKey())
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return CosmosSigner.verify(pub, data, signature)
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const height = await this.providerInstance.getHeight();
        return height;
    }

    async getFee(): Promise<BigNumber> {
        const fee = {
            amount: [
              {
                denom: "uatom",
                amount: "2000",
              },
            ],
            gas: "180000", // 180k
          };
        return fee;
    }

    async sendTx(data: any): Promise<string> {
        const send = await this.providerInstance.broadcastTx();
        return send;
    }

    async createTx(amount: BigNumber.Value, to: string): Promise<{ txId: string; tx: any; }> {
        throw "method not implemented"
    }

    getPublicKey(): string | Buffer {
        // throw "method not implemented"
        this.keyPair = signingcosmos.DirectSecp256k1HdWallet.fromMnemonic(this.wallet);
        const pub = this.keyPair.publicKey;
        // return Buffer.from(pub);
        return pub;
    }

}