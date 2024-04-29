import type { Signer } from "arbundles";
import { HexInjectedSolanaSigner } from "arbundles/web";
import BigNumber from "bignumber.js";
import type { TokenConfig, Tx } from "../../common/types";
import BaseWebToken from "./base";
import bs58 from "bs58";
// @ts-expect-error only importing as type
import type { MessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import retry from "async-retry";
import type { Finality } from "@solana/web3.js";
import { ComputeBudgetProgram, Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

export type GetFeeResult = {
  computeBudget: BigNumber;
  computeUnitPrice: BigNumber;
};
type Config = TokenConfig<MessageSignerWalletAdapter, { finality?: Finality; disablePriorityFees?: boolean }>;

export default class SolanaConfig extends BaseWebToken {
  private signer!: HexInjectedSolanaSigner;
  protected declare wallet: MessageSignerWalletAdapter;
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
    if (typeof owner === "string") {
      owner = Buffer.from(owner);
    }
    return bs58.encode(owner);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return await (await this.getSigner()).sign(data);
  }

  getSigner(): Signer {
    if (!this.signer) {
      // if (this.wallet?.name === "Phantom") {
      //     this.signer = new PhantomSigner(this.wallet)
      // } else {
      //     this.signer = new InjectedSolanaSigner(this.wallet)
      // }
      this.signer = new HexInjectedSolanaSigner(this.wallet);
    }
    return this.signer;
  }

  verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    // if (this.wallet?.name === "Phantom") {
    //     return PhantomSigner.verify(pub, data, signature)
    // }
    // return InjectedSolanaSigner.verify(pub, data, signature);
    return HexInjectedSolanaSigner.verify(pub, data, signature);
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

  async sendTx(data: any): Promise<string | undefined> {
    return await this.wallet.sendTransaction(data, await this.getProvider(), { skipPreflight: true });
  }

  async _createTxUnsigned(amount: BigNumber.Value, to: string, fee?: GetFeeResult): Promise<Transaction> {
    const pubkey = new PublicKey(await this.getPublicKey());

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

    const transaction = new Transaction({ ...blockHashInfo, feePayer: pubkey });

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: pubkey,
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

  async createTx(amount: BigNumber.Value, to: string, _fee?: GetFeeResult): Promise<{ txId: string | undefined; tx: any }> {
    const transaction = await this._createTxUnsigned(amount, to, _fee);

    return { tx: transaction, txId: undefined };
  }

  async getPublicKey(): Promise<string | Buffer> {
    if (!this.wallet.publicKey) throw new Error("Wallet.publicKey is undefined");
    return this.wallet.publicKey.toBuffer();
  }
}
