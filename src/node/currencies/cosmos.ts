import { Signer } from "arbundles/src/signing";
import { CosmosSigner } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"

import * as stargate from "@cosmjs/stargate";
import * as amino from "@cosmjs/amino";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

export default class CosmosConfig extends BaseNodeCurrency {

    protected keyPair;
    protected providerInstance?;
    protected signerInstance: CosmosSigner;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["uatom", 1e6];
        this._address = "You need to .ready() this currency!"
    }

    protected async getProvider(): Promise<any> {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.wallet);
        if (!this.providerInstance) {
            this.providerInstance = await stargate.SigningStargateClient.connectWithSigner(
                this.providerUrl,
                wallet
              );
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        console.log("polling getTx:", txId);
        const provider = await this.getProvider();
        const transaction = await provider.getTx(txId);
        const latestBlockHeight = new BigNumber(await this.getCurrentHeight()).toNumber();
        console.log(latestBlockHeight);
        console.log(transaction);
        const rawlog = JSON.parse(transaction.rawLog);
        const pending = (transaction.code !== 0);
        const tx = {
            from: rawlog[0].events[3].attributes[1].value,
            to: rawlog[0].events[3].attributes[0].value,
            amount: new BigNumber(rawlog[0].events[3].attributes[2].value.slice(0,-5)),
            blockHeight: new BigNumber(transaction.height),
            pending: pending,
            confirmed: latestBlockHeight - transaction.height >= this.minConfirm
        };
        console.log(tx);
        return tx;
    }

    ownerToAddress(owner: any): string {
        const encodePubkey = amino.encodeSecp256k1Pubkey(owner);
        const address = amino.pubkeyToAddress(encodePubkey, "cosmos")
        return address;
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return await this.getSigner().sign(data);
    }

    getSigner(): Signer {
        return this.signerInstance;
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return CosmosSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        const height = await provider.getHeight();
        return height;
    }

    async getFee(): Promise<BigNumber> {
        return new BigNumber(2000);
    }

    async sendTx(data: any): Promise<string> {
        const send = await (await this.getProvider()).broadcastTx(data);
        return send.transactionHash;
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        const account = this.ownerToAddress(this.getPublicKey());

        const sendingAmount = {
            denom: "uatom",
            amount: amount.toString(),
          };

        const sendingFee = {
            amount: [
                {
                denom: "uatom",
                amount: "2000",
                },
            ],
            gas: "100000",
        };

        const sendMsg: stargate.MsgSendEncodeObject = {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: account,
            toAddress: to,
            amount: [sendingAmount],
          }
        };
        const signedTx = await provider.sign(account, [sendMsg], sendingFee, "");
        const txBytes = TxRaw.encode(signedTx).finish();


        
        return { tx: txBytes, txId: null };
    }

    getPublicKey(): string | Buffer{
        const pk = this.signerInstance.pk;
        return pk;
    }

    async ready(): Promise<boolean> {
        this.signerInstance = new CosmosSigner(this.wallet);
        await this.signerInstance.ready();
        this.assignAddress();
        return true;
    }

}