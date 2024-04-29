import type { Signer } from "arbundles";
import { AlgorandSigner } from "arbundles";
import BigNumber from "bignumber.js";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "./base";

import axios from "axios";
import type { Account } from "algosdk";
import { decodeAddress, encodeAddress, makePaymentTxnWithSuggestedParamsFromObject, signTransaction, mnemonicToSecretKey } from "algosdk";

export default class AlgorandConfig extends BaseNodeToken {
  protected keyPair: Account;

  protected apiURL?;
  protected indexerURL?;

  constructor(config: TokenConfig) {
    super(config);
    this.base = ["microAlgos", 1e6];
    this.keyPair = mnemonicToSecretKey(this.wallet);
    this.apiURL = config.providerUrl;
    if (!config.opts.indexerUrl) throw new Error(`Algorand: required client constructor option 'opts.indexerUrl' is undefined`);
    this.indexerURL = config.opts.indexerUrl;
  }

  async getTx(txId: string): Promise<Tx> {
    const endpoint = `${this.indexerURL}/v2/transactions/${txId}`;
    const response = await axios.get(endpoint);

    const latestBlockHeight = new BigNumber(await this.getCurrentHeight()).toNumber();
    const txBlockHeight = new BigNumber(response.data.transaction["confirmed-round"]);

    const tx: Tx = {
      from: response.data.transaction.sender,
      to: response.data.transaction["payment-transaction"].receiver,
      amount: new BigNumber(response.data.transaction["payment-transaction"].amount),
      blockHeight: txBlockHeight,
      pending: false,
      confirmed: latestBlockHeight - txBlockHeight.toNumber() >= this.minConfirm,
    };
    return tx;
  }

  ownerToAddress(owner: any): string {
    return encodeAddress(owner);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return this.getSigner().sign(data);
  }

  getSigner(): Signer {
    return new AlgorandSigner(this.keyPair.sk, this.getPublicKey());
  }

  async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return AlgorandSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    //  "last-round" = blockheight
    const endpoint = `${this.apiURL}/v2/transactions/params`;
    const response = await axios.get(endpoint);
    return new BigNumber(await response.data["last-round"]);
  }

  async getFee(): Promise<BigNumber> {
    const endpoint = `${this.apiURL}/v2/transactions/params`;
    const response = await axios.get(endpoint);
    return new BigNumber(response.data["min-fee"]);
  }

  async sendTx(data: any): Promise<string | undefined> {
    const endpoint = `${this.apiURL}/v2/transactions`;
    const response = await axios.post(endpoint, data);
    return response.data.txId;
  }

  async createTx(amount: BigNumber.Value, to: string): Promise<{ txId: string | undefined; tx: any }> {
    const endpoint = `${this.apiURL}/v2/transactions/params`;
    const response = await axios.get(endpoint);
    const params = await response.data;
    const unsigned = makePaymentTxnWithSuggestedParamsFromObject({
      from: this.keyPair.addr,
      to: to,
      amount: new BigNumber(amount).toNumber(),
      note: undefined,
      suggestedParams: {
        fee: params.fee,
        firstRound: params["last-round"],
        flatFee: false,
        genesisHash: params["genesis-hash"],
        genesisID: params["genesis-id"],
        lastRound: params["last-round"] + 1000,
      },
    });
    const signed = signTransaction(unsigned, this.keyPair.sk);

    return { tx: signed.blob, txId: signed.txID };
  }

  getPublicKey(): string | Buffer {
    this.keyPair = mnemonicToSecretKey(this.wallet);
    const pub = decodeAddress(this.keyPair.addr).publicKey;
    return Buffer.from(pub);
  }
}
