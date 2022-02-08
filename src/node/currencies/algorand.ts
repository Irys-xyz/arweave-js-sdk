import { AlgorandSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"
import { decode, encode } from "bs58";

import * as algosdk from "algosdk";
import axios from "axios";


export default class AlgorandConfig extends BaseNodeCurrency {
    protected keyPair: algosdk.Account;

    protected apiURL?;
    protected indexerURL?;


    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["microAlgos", 1e6]
        this.keyPair = algosdk.mnemonicToSecretKey(this.wallet)
    }

    async getTx(txId: string): Promise<Tx> {
        const endpoint = `${this.indexerURL}/v2/transactions/${txId}`;
        let response;
        try {
            response = await axios.get(endpoint);
          } catch (error) {
            console.error(error);
          }
        const latestBlockHeight = new BigNumber(await this.getCurrentHeight()).toNumber();
        const txBlockHeight = new BigNumber(response["confirmed-round"]);

        return {
            from: response["sender"],
            to: response["payment-transaction"].receiver,
            amount: new BigNumber(response["payment-transaction"].amount),
            blockHeight: txBlockHeight,
            pending: false,
            confirmed: latestBlockHeight - txBlockHeight.toNumber() >= this.minConfirm
        }
    }

    ownerToAddress(owner: any): string {
        return (typeof owner === "string")
            ? decode(owner.replace("ed25519:", "")).toString("hex")
            : decode(encode(owner)).toString("hex")
    }


    async sign(data: Uint8Array): Promise<Uint8Array> {
        return this.getSigner().sign(data)
    }

    getSigner(): Signer {
        return new AlgorandSigner(this.wallet)
    }

    async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return AlgorandSigner.verify(pub, data, signature)
    }

    async getCurrentHeight(): Promise<BigNumber> {
        //  "last-round" = blockheight
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        let response;
        try {
            response = await axios.get(endpoint);
          } catch (error) {
            console.error(error);
          }
        return new BigNumber(response["last-round"]);
    }

    async getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        let response;
        try {
            response = await axios.get(endpoint);
          } catch (error) {
            console.error(error);
          }
        return new BigNumber(response["min-fee"]);
    }

    async sendTx(data: any): Promise<any> {
        const endpoint = `${this.apiURL}/v2/transactions`;
        let response;
        try {
            response = await axios.post(endpoint, data);
          } catch (error) {
            console.error(error);
          }

        return response["txId"]; // return TX id
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        let response;
        try {
            response = await axios.get(endpoint);
        }catch (error) {
            console.error(error);
        }

        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: this.keyPair.addr, 
            to: to, 
            amount: new BigNumber(amount).toNumber(), 
            suggestedParams: response.txParams
        });
           
        return { tx: txn, txId: undefined }      

    }

    getPublicKey(): string | Buffer {
        this.keyPair = algosdk.mnemonicToSecretKey(this.wallet)
        return Buffer.from(this.keyPair.addr)
    }
}