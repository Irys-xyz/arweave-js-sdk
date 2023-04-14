import type { Signer } from "arbundles";
import { SolanaSigner } from "arbundles";
import BigNumber from "bignumber.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { CurrencyConfig, Tx } from "../../common/types.js";
import BaseNodeCurrency from "../currency.js";
import retry from "async-retry";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

export default class SolanaConfig extends BaseNodeCurrency {
  protected declare providerInstance: Connection;
  minConfirm = 1;

  constructor(config: CurrencyConfig) {
    super(config);
    this.base = ["lamports", 1e9];
  }

  private async getProvider(): Promise<Connection> {
    if (!this.providerInstance) {
      this.providerInstance = new Connection(this.providerUrl, {
        confirmTransactionInitialTimeout: 60_000,
        commitment: "confirmed",
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
    const stx = await connection.getTransaction(txId, { commitment: "confirmed" });
    if (!stx) throw new Error("Confirmed tx not found");

    const currentSlot = await connection.getSlot("confirmed");
    if (!stx.meta) throw new Error(`Unable to resolve transaction ${txId}`);

    const amount = new BigNumber(stx.meta.postBalances[1]).minus(new BigNumber(stx.meta.preBalances[1]));

    const tx: Tx = {
      from: stx.transaction.message.accountKeys[0].toBase58(),
      to: stx.transaction.message.accountKeys[1].toBase58(),
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
      return await sendAndConfirmTransaction(connection, data, [this.getKeyPair()], { commitment: "confirmed" });
    } catch (e: any) {
      if (e.message.includes("30.")) {
        const txId = (e.message as string).match(/[A-Za-z0-9]{87,88}/g);
        if (!txId) throw e;
        try {
          const conf = await connection.confirmTransaction(txId[0], "confirmed");
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
          return await (await this.getProvider()).getRecentBlockhash();
        } catch (e: any) {
          if (e.message?.includes("blockhash")) throw e;
          else bail(e);
          throw new Error("Unreachable");
        }
      },
      { retries: 3, minTimeout: 1000 },
    );

    const transaction = new Transaction({ recentBlockhash: blockHashInfo.blockhash, feePayer: keys.publicKey });

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
