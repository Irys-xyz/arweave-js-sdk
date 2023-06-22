import Arweave from "arweave";
import BigNumber from "bignumber.js";
import crypto from "crypto";
import type { CurrencyConfig, Tx } from "../../common/types";
import base64url from "base64url";
import BaseWebCurrency from "../currency";
import { SIG_CONFIG, SignatureConfig } from "arbundles/web";
import type { Signer } from "arbundles/web";

class InjectedArweaveSigner implements Signer {
  private signer: any;
  public publicKey!: Buffer;
  readonly ownerLength: number = SIG_CONFIG[SignatureConfig.ARWEAVE].pubLength;
  readonly signatureLength: number = SIG_CONFIG[SignatureConfig.ARWEAVE].sigLength;
  readonly signatureType = SignatureConfig.ARWEAVE;

  constructor(windowArweaveWallet: any) {
    this.signer = windowArweaveWallet;
  }

  async setPublicKey(): Promise<void> {
    const arOwner = await this.signer.getActivePublicKey();
    this.publicKey = base64url.toBuffer(arOwner);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!this.publicKey) {
      await this.setPublicKey();
    }

    const algorithm = {
      name: "RSA-PSS",
      saltLength: 0,
    };

    const signature = await this.signer.signature(message, algorithm);
    const buf = new Uint8Array(Object.values(signature));
    return buf;
  }

  static async verify(pk: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await Arweave.crypto.verify(pk, message, signature);
  }

  async refresh(wallet: any): Promise<void> {
    this.signer = wallet;
    await this.setPublicKey();
  }
}

export default class ArweaveConfig extends BaseWebCurrency {
  protected signer!: InjectedArweaveSigner;
  protected declare providerInstance?: Arweave;
  protected declare wallet: Window["arweaveWallet"];
  opts?: { provider?: "arconnect" | "arweave.app"; network?: string };

  constructor(config: CurrencyConfig) {
    super(config);
    this.base = ["winston", 1e12];
    this.needsFee = true;
  }

  private async getProvider(): Promise<Arweave> {
    if (!this.providerInstance) {
      const purl = new URL(this.providerUrl ?? "https://arweave.net");
      let config;
      try {
        config = this.wallet.getArweaveConfig();
      } catch (e) {}
      this.providerInstance = Arweave.init(
        config ?? {
          host: purl.hostname,
          protocol: purl.protocol.replaceAll(":", "").replaceAll("/", ""),
          port: purl.port,
          network: this?.opts?.network,
        },
      );
      this.providerInstance = Arweave.init({ host: purl.hostname, protocol: purl.protocol.replaceAll(":", "").replaceAll("/", ""), port: purl.port });
    }
    return this.providerInstance;
  }

  async getTx(txId: string): Promise<Tx> {
    const arweave = await this.getProvider();
    const txs = await arweave.transactions.getStatus(txId);
    let tx;
    if (txs.status == 200) {
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
      pending: txs.status == 202,
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
    return Arweave.crypto.sign(this.wallet as any, data);
  }

  getSigner(): Signer {
    if (!this.signer) {
      this.signer = new InjectedArweaveSigner(this.wallet);
    }
    return this.signer;
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    if (Buffer.isBuffer(pub)) {
      pub = pub.toString();
    }
    return Arweave.crypto.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return (await this.getProvider()).network.getInfo().then((r) => new BigNumber(r.height));
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
    return new BigNumber(await (await this.getProvider()).transactions.getPrice(new BigNumber(amount).toNumber(), to)).integerValue(
      BigNumber.ROUND_CEIL,
    );
  }

  async sendTx(data: any): Promise<any> {
    return await (await this.getProvider()).transactions.post(data);
  }

  async createTx(amount: BigNumber, to: string, fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    const arweave = await this.getProvider();
    // use _address property or default to empty string
    const tx = await arweave.createTransaction({ quantity: amount.toString(), reward: fee, target: to });
    // do not pass wallet argument as it will be injected by browser wallet
    await arweave.transactions.sign(tx);
    return { txId: tx.id, tx };
  }

  async getPublicKey(): Promise<string | Buffer> {
    const signer = (await this.getSigner()) as InjectedArweaveSigner;
    await signer.setPublicKey();
    return signer.publicKey;
  }

  public async ready(): Promise<void> {
    await this.getSigner();
    await this.signer.setPublicKey();
    this._address = this.ownerToAddress(await this.getPublicKey());
    this.providerInstance = await this.getProvider();

    await this.providerInstance.network.getInfo();
  }
}
