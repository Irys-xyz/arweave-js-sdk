import { BigNumber as EthBigNumber } from "@ethersproject/bignumber";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import BigNumber from "bignumber.js";
import { EthereumSigner, keccak256 } from "arbundles";
import type { Signer } from "arbundles";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "./base";

const ethereumSigner = EthereumSigner;

export default class EthereumConfig extends BaseNodeToken {
  protected declare providerInstance: JsonRpcProvider;

  constructor(config: TokenConfig) {
    super(config);
    this.base = ["wei", 1e18];
  }

  protected async getProvider(): Promise<JsonRpcProvider> {
    if (!this.providerInstance) {
      this.providerInstance = new JsonRpcProvider({
        url: this.providerUrl,
        skipFetchSetup: true,
        ...this?.opts?.providerOptions,
      });
      await this.providerInstance.ready;
    }
    return this.providerInstance;
  }

  async getTx(txId: string): Promise<Tx> {
    const provider = await this.getProvider();

    const response = await provider.getTransaction(txId);

    if (!response) throw new Error("Tx doesn't exist");
    if (!response.to) throw new Error(`Unable to determine transaction ${txId} recipient`);

    // console.log(response.confirmations);

    return {
      from: response.from,
      to: response.to,
      blockHeight: response.blockNumber ? new BigNumber(response.blockNumber) : undefined,
      amount: new BigNumber(response.value.toHexString(), 16),
      pending: response.blockNumber ? false : true,
      confirmed: response.confirmations >= this.minConfirm,
    };
  }

  ownerToAddress(owner: any): string {
    return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const signer = this.getSigner();
    return signer.sign(data);
  }

  getSigner(): Signer {
    return new ethereumSigner(this.wallet);
  }

  verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return ethereumSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    const response = await (await this.getProvider()).send("eth_blockNumber", []);
    return new BigNumber(response, 16);
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
    const provider = await this.getProvider();
    const _amount = new BigNumber(amount);
    const tx = {
      from: this.address,
      to,
      value: "0x" + _amount.toString(16),
    };

    const estimatedGas = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();

    // const b = await provider.send("eth_maxPriorityFeePerGas", [])
    // console.log(b)
    return new BigNumber(estimatedGas.mul(gasPrice).toString());
  }

  async sendTx(data: any): Promise<any> {
    return await (await this.getProvider()).sendTransaction(data).catch((e) => {
      console.error(`Error occurred while sending a tx - ${e}`);
      throw e;
    });
  }

  async createTx(amount: BigNumber.Value, to: string, fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    const provider = await this.getProvider();
    const wallet = new Wallet(this.wallet, provider);

    const _amount = "0x" + new BigNumber(amount).toString(16);

    let gasPrice = await provider.getGasPrice();
    const gasEstimate = fee ? EthBigNumber.from(new BigNumber(fee).dividedToIntegerBy(gasPrice.toString()).toFixed()) : undefined;

    // const estimatedGas = await provider.estimateGas({ from: this.address, to, value: _amount });

    // console.log({ gasPrice, estimatedGas })

    // if (fee) {
    //     gasPrice = ethers.BigNumber.from(Math.ceil(+fee / estimatedGas.toNumber()))
    // }

    if (this.name === "matic") {
      gasPrice = EthBigNumber.from(new BigNumber(gasPrice.toString()).multipliedBy(10).decimalPlaces(0).toString());
    }

    const tx = await wallet.populateTransaction({
      to,
      value: _amount,
      from: this.address,
      gasPrice,
      // gasLimit: estimatedGas,
      gasLimit: gasEstimate,
      // nonce: b // await provider.getTransactionCount(this.address),
      // chainId: await (await provider.getNetwork()).chainId
    });
    // tx.gasLimit = ethers.BigNumber.from(+(tx.gasLimit.toString()) * 4)
    const signedTx = await wallet.signTransaction(tx);
    const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
    // const c = await provider.call(tx);
    // console.log(c)
    return { txId, tx: signedTx };
  }

  getPublicKey(): Buffer {
    return this.getSigner().publicKey;
  }
}
