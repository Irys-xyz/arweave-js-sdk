import { Signer } from "arbundles/src/signing";
import { CosmosSigner } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"
import { getRedstonePrice } from "../currency";

import * as stargate from "@cosmjs/stargate";
import * as amino from "@cosmjs/amino";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { HdPath, Slip10RawIndex } from "@cosmjs/crypto";

export default class CosmosConfig extends BaseNodeCurrency {

    protected keyPair;
    protected providerInstance?;
    protected signerInstance: CosmosSigner;
    public localconfig: any = {
        "cosmos": { 
            "derivePath": "118",
            "fee": "2500",
            "denomination": "uatom",
            "decimals": 1e6
        },
    }
    sleep = (ms): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = [this.localconfig[this.name].denomination, this.localconfig[this.name].decimals];
        this._address = "You need to .ready() this currency!"
    }

    protected async getProvider(): Promise<any> {
        const path2number = new BigNumber(this.localconfig[this.name].derivePath).toNumber();
        const path: HdPath = [
            Slip10RawIndex.hardened(44),
            Slip10RawIndex.hardened(path2number),
            Slip10RawIndex.hardened(0),
            Slip10RawIndex.normal(0),
            Slip10RawIndex.normal(0),
          ];
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.wallet, { "prefix": this.name, "hdPaths": [path] } );
        if (!this.providerInstance) {
            this.providerInstance = await stargate.SigningStargateClient.connectWithSigner(
                this.providerUrl,
                wallet
              );
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider();
        const transaction = await provider.getTx(txId);
        const rawlog = JSON.parse(transaction.rawLog);
        const confirmed = (transaction.code === 0);
        let tx;
         if(this.name === "akash"){
            tx = {
                from: rawlog[0].events[1].attributes[1].value,
                to: rawlog[0].events[1].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[1].attributes[2].value.slice(0,-(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        }else{
            tx = {
                from: rawlog[0].events[3].attributes[1].value,
                to: rawlog[0].events[3].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[3].attributes[2].value.slice(0,-(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        }
        return tx;
    }
    
    ownerToAddress(owner: any): string {
        const encodePubkey = amino.encodeSecp256k1Pubkey(owner);
        const address = amino.pubkeyToAddress(encodePubkey, this.name);
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
        return new BigNumber(this.localconfig[this.name].fee);
    }

    async sendTx(data: any): Promise<string> {
        const send = await (await this.getProvider()).broadcastTx(data, 60000, 3000);
        return send.transactionHash;
    }

    async createTx(amount: BigNumber.Value, to: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        const account = this.ownerToAddress(this.getPublicKey());

        const sendingAmount = {
            denom: this.base[0],
            amount: amount.toString(),
          };

        const sendingFee = {
            amount: [
                {
                denom: this.base[0],
                amount: this.localconfig[this.name].fee,
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
        this.signerInstance = new CosmosSigner(this.wallet, this.localconfig[this.name].derivePath);
        await this.signerInstance.ready();
        this.assignAddress();
        return true;
    }

    public async getGas(): Promise<[BigNumber, number]> {
        return [new BigNumber(await getRedstonePrice("ATOM")), 1e6]
    }

}