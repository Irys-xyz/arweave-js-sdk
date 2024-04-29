import type { Signer } from "arbundles";
import { HexSolanaSigner } from "arbundles";
import BigNumber from "bignumber.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "./base";
import retry from "async-retry";
import type { Finality } from "@solana/web3.js";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

export type GetFeeResult = {
  computeBudget: BigNumber;
  computeUnitPrice: BigNumber;
};

type Config = TokenConfig<any, { finality?: Finality; disablePriorityFees?: boolean }>;

export default class SolanaConfig extends BaseNodeToken {
  protected declare providerInstance: Connection;
  minConfirm = 1;
  protected finality: Finality = "finalized";
  declare config: Config;

  constructor(config: Config) {
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
    return new HexSolanaSigner(keypb);
  }

  verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return HexSolanaSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber((await (await this.getProvider()).getEpochInfo()).blockHeight ?? 0);
  }

  async getFee(amount: BigNumber.Value, to?: string, multiplier?: BigNumber.Value): Promise<GetFeeResult> {
    const connection = await this.getProvider();
    const unsignedTx = await this._createTxUnsigned(amount, to ?? "DHyDV2ZjN3rB6qNGXS48dP5onfbZd3fAEz6C5HJwSqRD");
    const computeBudget = new BigNumber((await unsignedTx.getEstimatedFee(connection)) ?? 5000);
    const recentPrio = await connection?.getRecentPrioritizationFees?.().catch((_) => [{ prioritizationFee: 0 }]);
    const prioAvg = (recentPrio as { prioritizationFee: number }[])
      .reduce((n: BigNumber, p) => n.plus(p.prioritizationFee), new BigNumber(0))
      .dividedToIntegerBy(recentPrio.length ?? 1);
    return { computeBudget, computeUnitPrice: prioAvg.multipliedBy(multiplier ?? 1).integerValue(BigNumber.ROUND_CEIL) };
  }

  async sendTx(data: Transaction): Promise<string | undefined> {
    const connection = await this.getProvider();
    try {
      return await sendAndConfirmTransaction(connection, data, [this.getKeyPair()], { commitment: this.finality });
    } catch (e: any) {
      if (e.message.includes("30.")) {
        const txId = (e.message as string).match(/[A-Za-z0-9]{87,88}/g);
        if (!txId) throw e;
        try {
          const conf = await connection.confirmTransaction(
            { signature: txId[0], blockhash: data.recentBlockhash!, lastValidBlockHeight: data.lastValidBlockHeight! },
            this.finality,
          );
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

  async _createTxUnsigned(amount: BigNumber.Value, to: string, fee?: GetFeeResult): Promise<Transaction> {
    const keys = this.getKeyPair();

    const blockHashInfo = await retry(
      async (bail) => {
        try {
          return await (await this.getProvider()).getLatestBlockhash(this.finality);
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
    if (!this?.config?.opts?.disablePriorityFees && fee) {
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee.computeUnitPrice.toNumber() }));
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: fee.computeBudget.toNumber() }));
    }
    return transaction;
  }

  async createTx(amount: BigNumber.Value, to: string, fee?: GetFeeResult): Promise<{ txId: string | undefined; tx: any }> {
    const keys = this.getKeyPair();
    const unsignedTx = await this._createTxUnsigned(amount, to, fee);

    const transactionBuffer = unsignedTx.serializeMessage();
    const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
    unsignedTx.addSignature(keys.publicKey, Buffer.from(signature));
    return { tx: unsignedTx, txId: undefined };
  }

  getPublicKey(): string | Buffer {
    const key = this.getKeyPair();
    return key.publicKey.toBuffer();
  }
}
