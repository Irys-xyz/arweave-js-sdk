import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import * as web3 from "@solana/web3.js";
import { signers } from "arbundles";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
import retry from "async-retry";

const solanaSigner = signers.SolanaSigner;

export default class SolanaConfig extends BaseNodeCurrency {
    protected providerInstance: web3.Connection;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["lamports", 1e9];
    }


    private async getProvider(): Promise<web3.Connection> {
        if (!this.providerInstance) {
            this.providerInstance = new web3.Connection(
                this.providerUrl,
                { commitment: "confirmed" }
            );
        }
        return this.providerInstance;
    }

    private getKeyPair(): web3.Keypair {
        let key = this.wallet
        if (typeof key !== "string") {
            key = bs58.encode(Buffer.from(key));
        }
        return web3.Keypair.fromSecretKey(bs58.decode(key));
    }

    async getTx(txId: string): Promise<Tx> {
        const connection = await this.getProvider()
        const stx = await connection.getTransaction(txId, { commitment: "confirmed" });
        if (!stx) throw new Error("Confirmed tx not found");

        const currentSlot = await connection.getSlot("confirmed");

        const amount = new BigNumber(stx.meta.postBalances[1]).minus(
            new BigNumber(stx.meta.preBalances[1]),
        );

        const tx: Tx = {
            from: stx.transaction.message.accountKeys[0].toBase58(),
            to: stx.transaction.message.accountKeys[1].toBase58(),
            amount: amount,
            blockHeight: new BigNumber(stx.slot),
            pending: false,
            confirmed: currentSlot - stx.slot >= 10,
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
        const keypb = bs58.encode(
            Buffer.concat([keyp.secretKey, keyp.publicKey.toBuffer()]),
        );
        return new solanaSigner(keypb);
    }

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return solanaSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        return new BigNumber((await (await this.getProvider()).getEpochInfo()).blockHeight);
    }

    async getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        const connection = await this.getProvider()
        const block = await connection.getRecentBlockhash();
        const feeCalc = await connection.getFeeCalculatorForBlockhash(
            block.blockhash,
        );
        return new BigNumber(feeCalc.value.lamportsPerSignature);
    }

    async sendTx(data: any): Promise<string | undefined> {
        const connection = await this.getProvider()
        // if it's already been signed...
        // if (data.signature) {
        //     console.log("Sending");
        //     console.log(data);
        //     await web3.sendAndConfirmRawTransaction(connection, data.serialize(), { commitment: "confirmed" });
        //     console.log("Sent");
        //     return;
        // }
        return await web3.sendAndConfirmTransaction(connection, data, [this.getKeyPair()], { commitment: "confirmed" });
    }

    async createTx(
        amount: BigNumber.Value,
        to: string,
        _fee?: string,
    ): Promise<{ txId: string; tx: any }> {
        // TODO: figure out how to manually set fees

        const keys = this.getKeyPair();

        const hash = await retry(
          async (bail) => {
              try {
                  return (await (await this.getProvider()).getRecentBlockhash()).blockhash
              } catch (e) {
                  if (e.message?.includes("blockhash")) throw e;
                  else bail(e);
                  throw new Error("Unreachable");
              }
        },
          { retries: 3, minTimeout: 1000 }
        );

        const transaction = new web3.Transaction({
            recentBlockhash: hash,
            feePayer: keys.publicKey,
        });

        transaction.add(
            web3.SystemProgram.transfer({
                fromPubkey: keys.publicKey,
                toPubkey: new web3.PublicKey(to),
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
