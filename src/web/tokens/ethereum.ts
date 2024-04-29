import type { JsonRpcSigner, TransactionRequest, Web3Provider } from "@ethersproject/providers";
import { BigNumber as EthBigNumber } from "@ethersproject/bignumber";
import BigNumber from "bignumber.js";
import type { Tx, TokenConfig } from "../../common/types";
import BaseWebToken from "./base";
import { InjectedTypedEthereumSigner, type InjectedTypedEthereumSignerMinimalSigner } from "arbundles/web";

const ethereumSigner = InjectedTypedEthereumSigner;

export type MinimalSigner = InjectedTypedEthereumSignerMinimalSigner &
  Pick<JsonRpcSigner, "sendTransaction" | "estimateGas" | "getGasPrice" | "populateTransaction">;
export type MinimalProvider = { getSigner: () => MinimalSigner } & Pick<
  Web3Provider,
  "getTransaction" | "getNetwork" | "_ready" | "send" | "estimateGas" | "getGasPrice" | "getTransactionCount"
>;
export default class EthereumConfig extends BaseWebToken {
  public signer!: InjectedTypedEthereumSigner;
  public declare wallet: MinimalProvider;
  public w3signer!: MinimalSigner;
  public declare providerInstance: MinimalProvider;
  public readonly inheritsRPC = true;

  constructor(config: TokenConfig) {
    super(config);
    this.base = ["wei", 1e18];
  }

  async getTx(txId: string): Promise<Tx> {
    const provider = this.providerInstance;
    const response = await provider.getTransaction(txId);

    if (!response) throw new Error("Tx doesn't exist");
    if (!response.to) throw new Error(`Unable to resolve transactions ${txId} receiver`);

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
    // return (
    //   "0x" +
    //   keccak256(Buffer.from(owner.slice(1)))
    //     .slice(-20)
    //     .toString("hex")
    // );
    // return owner;
    return owner.toString().toLowerCase();
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const signer = await this.getSigner();
    return signer.sign(data);
  }

  getSigner(): InjectedTypedEthereumSigner {
    if (!this.signer) {
      this.signer = new InjectedTypedEthereumSigner(this.wallet);
    }
    return this.signer;
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return ethereumSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    const provider = this.providerInstance;
    const response = await provider.send("eth_blockNumber", []);

    return new BigNumber(response, 16);
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
    const provider = this.providerInstance;

    const tx = {
      to,
      from: this.address,
      value: "0x" + new BigNumber(amount).toString(16),
    };

    const estimatedGas = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();
    return new BigNumber(estimatedGas.mul(gasPrice).toString());
  }

  async sendTx(data: TransactionRequest): Promise<string | undefined> {
    const signer = this.w3signer;
    const receipt = await signer.sendTransaction(data); // .catch((e) => { console.error(`Sending tx: ${e}`) })
    return receipt ? receipt.hash : undefined;
  }

  async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    const amountc = EthBigNumber.from(new BigNumber(amount).toFixed());
    const signer = this.w3signer;
    const estimatedGas = await signer.estimateGas({ to, from: this.address, value: amountc.toHexString() });
    let gasPrice = await signer.getGasPrice();
    if (this.name === "matic") {
      gasPrice = EthBigNumber.from(new BigNumber(gasPrice.toString()).multipliedBy(10).decimalPlaces(0).toString());
    }
    const txr = await signer.populateTransaction({ to, from: this.address, value: amountc.toHexString(), gasPrice, gasLimit: estimatedGas });
    return { txId: undefined, tx: txr };
  }

  public async getPublicKey(): Promise<string | Buffer> {
    return this.address!;
  }

  public async ready(): Promise<void> {
    this.w3signer = await this.wallet.getSigner();
    this._address = (await this.w3signer.getAddress()).toString().toLowerCase();
    await this.getSigner().ready();
    // this.providerInstance = new .JsonRpcProvider(this.providerUrl);
    this.providerInstance = this.wallet;
    await this.providerInstance?._ready?.();
  }
}
