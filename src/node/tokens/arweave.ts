import type { Signer } from "arbundles";
import { ArweaveSigner } from "arbundles";
import type Transaction from "arweave/node/lib/transaction";
import base64url from "base64url";
import BigNumber from "bignumber.js";
import crypto from "crypto";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "./base";
import { Arweave } from "../utils";

export default class ArweaveConfig extends BaseNodeToken {
  protected declare providerInstance?: Arweave;

  constructor(config: TokenConfig) {
    super(config);
    this.base = ["winston", 1e12];
    this.needsFee = true;
  }

  private async getProvider(): Promise<Arweave> {
    if (!this.providerInstance) {
      const purl = new URL(this.providerUrl ?? "https://arweave.net");
      // this.providerInstance = Arweave.init({
      //   host: purl.hostname,
      //   protocol: purl.protocol.replaceAll(":", "").replaceAll("/", ""),
      //   port: purl.port,
      //   network: this?.opts?.network,
      // });
      this.providerInstance = new Arweave({ url: purl, network: this?.opts?.network });
    }
    return this.providerInstance;
  }

  async getTx(txId: string): Promise<Tx> {
    const arweave = await this.getProvider();
    const txs = await arweave.transactions.getStatus(txId);
    let tx;
    if (txs.status === 200) {
      tx = await arweave.transactions.get(txId);
    }
    const confirmed = txs.status !== 202 && (txs.confirmed?.number_of_confirmations ?? 0) >= this.minConfirm;
    let owner;
    if (tx?.owner) {
      owner = this.ownerToAddress(tx.owner);
    }
    return {
      from: owner ?? undefined,
      to: tx?.target ?? undefined,
      amount: new BigNumber(tx?.quantity ?? 0),
      pending: txs.status === 202,
      confirmed,
    };
  }

  ownerToAddress(owner: any): string {
    return Arweave.utils.bufferTob64Url(
      crypto
        .createHash("sha256")
        .update(Arweave.utils.b64UrlToBuffer(Buffer.isBuffer(owner) ? base64url(owner) : owner))
        .digest(),
    );
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return (await this.getProvider()).crypto.sign(this.wallet, data);
  }

  getSigner(): Signer {
    return new ArweaveSigner(this.wallet);
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    if (Buffer.isBuffer(pub)) {
      pub = pub.toString();
    }
    return (await this.getProvider()).crypto.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return (await this.getProvider()).network.getInfo().then((r) => new BigNumber(r.height));
  }

  async getFee(_amount: BigNumber.Value, to?: string): Promise<BigNumber> {
    // amount is the amount of winston being transferred, but arweave prices based on the size of the transaction. so we set size to 0 here
    return new BigNumber(await (await this.getProvider()).transactions.getPrice(0, to)).integerValue(BigNumber.ROUND_CEIL);
  }

  async sendTx(data: Transaction): Promise<any> {
    const provider = await this.getProvider();
    const res = await provider.transactions.post(data);
    if (res.statusText.includes("Nodes rejected the TX headers")) {
      // check user balance
      const balance = new BigNumber(await provider.wallets.getBalance(this.address!));
      if (balance.isLessThanOrEqualTo(data.quantity))
        throw new Error(
          `${this.address} has a balance of ${balance.toString()} winston, less than the required ${new BigNumber(data.reward).plus(data.quantity)}.`,
        );
    }
    return res;
  }

  async createTx(amount: BigNumber.Value, to: string, fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    const arweave = await this.getProvider();
    const tx = await arweave.createTransaction({ quantity: new BigNumber(amount).toString(), reward: fee, target: to }, this.wallet);
    await arweave.transactions.sign(tx, this.wallet);
    return { txId: tx.id, tx };
  }

  getPublicKey(): string {
    return this.wallet.n;
  }
}
