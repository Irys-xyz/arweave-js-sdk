import type { Signer } from "arbundles";
import { SolanaSigner } from "arbundles";
import BigNumber from "bignumber.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "../token";
import retry from "async-retry";
import type { Finality } from "@solana/web3.js";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

export default class SolanaConfig extends BaseNodeToken {
  protected declare providerInstance: Connection;
  minConfirm = 1;
  protected finality: Finality = "finalized";

  constructor(config: TokenConfig) {
    super(config);
    this.base = ["lamports", 1e9];
    this.finality = this?.opts?.finality ?? "finalized";
  }

  private async getProvider(): Promise<Connection> {
    if (!this.providerInstance) {
      this.providerInstance = new Connection(this.providerUrl, {
        confirmTransactionInitialTimeout: 60_000,
        commitment: this.finality,
      });
    }
    return this.providerInstance;
  }

  private getKeyPair(): Keypair {
    let key = this.wallet;
    if (typeof key !== "string") {
      key = bs58.encode(Buffer.from(key));
    }
    return Keypair.fromSecretKey(bs58.decode(key));
  }

  async getTx(txId: string): Promise<Tx> {
    const connection = await this.getProvider();

    const stx = await connection.getTransaction(txId, { commitment: this.finality, maxSupportedTransactionVersion: 0 });
    if (!stx) throw new Error("Confirmed tx not found");

    const currentSlot = await connection.getSlot(this.finality);
    if (!stx.meta) throw new Error(`Unable to resolve transaction ${txId}`);

    const amount = new BigNumber(stx.meta.postBalances[1]).minus(new BigNumber(stx.meta.preBalances[1]));
    const staticAccountKeys = stx.transaction.message.getAccountKeys().staticAccountKeys;
    const tx: Tx = {
      from: staticAccountKeys[0].toBase58(),
      to: staticAccountKeys[1].toBase58(),
      amount: amount,
      blockHeight: new BigNumber(stx.slot),
      pending: false,
      confirmed: currentSlot - stx.slot >= 1,
    };
    return tx;
  }

  ownerToAddress(owner: any): string {
    return bs58.encode(owner);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return await (await this.getSigner()).sign(data);
  }

  getSigner(): Signer {
    const keyp = this.getKeyPair();
    const keypb = bs58.encode(Buffer.concat([Buffer.from(keyp.secretKey), keyp.publicKey.toBuffer()]));
    return new SolanaSigner(keypb);
  }

  verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return SolanaSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber((await (await this.getProvider()).getEpochInfo()).blockHeight ?? 0);
  }

  async getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
    // const connection = await this.getProvider()
    // const block = await connection.getRecentBlockhash();
    // const feeCalc = await connection.getFeeCalculatorForBlockhash(
    //     block.blockhash,
    // );
    // return new BigNumber(feeCalc.value.lamportsPerSignature);
    return new BigNumber(5000); // hardcode it for now
  }

  async sendTx(data: any): Promise<string | undefined> {
    const connection = await this.getProvider();
    try {
      return await sendAndConfirmTransaction(connection, data, [this.getKeyPair()], { commitment: this.finality });
    } catch (e: any) {
      if (e.message.includes("30.")) {
        const txId = (e.message as string).match(/[A-Za-z0-9]{87,88}/g);
        if (!txId) throw e;
        try {
          const conf = await connection.confirmTransaction(txId[0], this.finality);
          if (conf) return undefined;
          throw {
            message: e.message,
            txId: txId[0],
          };
        } catch (e: any) {
          throw {
            message: e.message,
            txId: txId[0],
          };
        }
      }
      throw e;
    }
  }

  async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    // TODO: figure out how to manually set fees

    const keys = this.getKeyPair();

    const blockHashInfo = await retry(
      async (bail) => {
        try {
          return await (await this.getProvider()).getLatestBlockhash();
        } catch (e: any) {
          if (e.message?.includes("blockhash")) throw e;
          else bail(e);
          throw new Error("Unreachable");
        }
      },
      { retries: 3, minTimeout: 1000 },
    );

    const transaction = new Transaction({ ...blockHashInfo, feePayer: keys.publicKey });

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: keys.publicKey,
        toPubkey: new PublicKey(to),
        lamports: +new BigNumber(amount).toNumber(),
      }),
    );

    const transactionBuffer = transaction.serializeMessage();
    const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
    transaction.addSignature(keys.publicKey, Buffer.from(signature));
    return { tx: transaction, txId: undefined };
  }

  getPublicKey(): string | Buffer {
    const key = this.getKeyPair();
    return key.publicKey.toBuffer();
  }
}
