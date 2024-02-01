import BigNumber from "bignumber.js";
import { Contract } from "@ethersproject/contracts";
import type { TokenConfig, Tx } from "../../common/types";
import EthereumConfig from "./ethereum";
import { erc20abi } from "../../common/utils";

export interface ERC20TokenConfig extends TokenConfig {
  contractAddress: string;
}

export default class ERC20Config extends EthereumConfig {
  public contractInstance!: Contract;
  public contractAddress: string;

  constructor(config: ERC20TokenConfig) {
    super(config);
    this.contractAddress = config.contractAddress;
  }

  async getContract(): Promise<Contract> {
    if (!this.contractInstance) {
      // @ts-expect-error minimal type
      this.contractInstance = new Contract(this.contractAddress, erc20abi, this.w3signer);
      this.base = ["wei", Math.pow(10, await this.contractInstance.decimals())];
    }
    return this.contractInstance;
  }

  async getTx(txId: string): Promise<Tx> {
    const response = await this.providerInstance.getTransaction(txId);
    if (!response) throw new Error("Tx doesn't exist");
    if (
      response.data.length !== 138 ||
      response.data.slice(2, 10) !== "a9059cbb" // standard ERC20-ABI method ID for transfers
    ) {
      throw new Error("Tx isn't a ERC20 transfer");
    }
    const to = `0x${response.data.slice(34, 74)}`;
    const amount = new BigNumber(response.data.slice(74), 16);

    return {
      from: response.from,
      to,
      blockHeight: response.blockNumber ? new BigNumber(response.blockNumber) : undefined,
      amount,
      pending: response.blockNumber ? false : true,
      confirmed: response.confirmations >= this.minConfirm,
    };
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
    const _amount = "0x" + new BigNumber(amount).toString(16);
    const contract = await this.getContract();

    const gasPrice = await this.providerInstance.getGasPrice();
    const gasLimit = await contract.estimateGas.transfer(to, _amount);
    const units = new BigNumber(gasPrice.mul(gasLimit).toString()); // price in WEI
    return units;
  }

  async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    // const provider = await this.getProvider()
    // const wallet = new Wallet(this.wallet, this.providerInstance);
    const contract = await this.getContract();
    const _amount = "0x" + new BigNumber(amount).toString(16);
    const tx = await contract.populateTransaction.transfer(to, _amount);
    // Needed *specifically* for ERC20
    tx.gasPrice = await this.providerInstance.getGasPrice();
    tx.gasLimit = await contract.estimateGas.transfer(to, _amount);
    tx.chainId = (await this.providerInstance.getNetwork()).chainId;
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run Irys.ready()");
    tx.nonce = await this.providerInstance.getTransactionCount(this.address);
    // const txr = this.w3signer.populateTransaction()
    // const signedTx = await this.wallet.signTransaction(tx);
    // const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
    return { txId: undefined, tx: tx };
  }
}
