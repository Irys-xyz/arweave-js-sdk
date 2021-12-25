import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import * as web3 from "@solana/web3.js";
import { signers } from "arbundles";
import bs58 from "bs58";
import nacl from "tweetnacl";
import BaseCurrency from "../../common/currency";
import { Tx } from "../../common/types";
import { CurrencyConfig } from "../types";

const { SolanaSigner } = signers;

export default class SolanaConfig extends BaseCurrency {
    protected providerInstance: web3.Connection;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["lamports", 1e9];
    }

    public async ready(): Promise<void> {
        this.providerInstance = new web3.Connection(
            web3.clusterApiUrl(this.provider as web3.Cluster),
            "confirmed",
        );
        await super.ready();
    }


    private getKeyPair(): web3.Keypair {
        let key = this.wallet
        if (typeof key !== "string") {
            key = bs58.encode(Buffer.from(key));
        }
        return web3.Keypair.fromSecretKey(bs58.decode(key));
    }

    async getTx(txId: string): Promise<Tx> {
        const connection = this.providerInstance
        const stx = await connection.getTransaction(txId, {
            commitment: "confirmed",
        });
        if (!stx) throw new Error("Confirmed tx not found");

        const confirmed = !(
            (await connection.getTransaction(txId, { commitment: "finalized" })) ===
            null
        );
        const amount = new BigNumber(stx.meta.postBalances[1]).minus(
            new BigNumber(stx.meta.preBalances[1]),
        );
        const tx: Tx = {
            from: stx.transaction.message.accountKeys[0].toBase58(),
            to: stx.transaction.message.accountKeys[1].toBase58(),
            amount: amount,
            blockHeight: new BigNumber(stx.slot),
            pending: false,
            confirmed,
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
        return new SolanaSigner(keypb);
    }

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return SolanaSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const connection = this.providerInstance
        return new BigNumber((await connection.getEpochInfo()).blockHeight);
    }

    async getFee(_amount: number | BigNumber, _to?: string): Promise<BigNumber> {
        const connection = this.providerInstance
        const block = await connection.getRecentBlockhash();
        const feeCalc = await connection.getFeeCalculatorForBlockhash(
            block.blockhash,
        );
        return new BigNumber(feeCalc.value.lamportsPerSignature);
    }

    async sendTx(data: any): Promise<void> {
        const connection = this.providerInstance
        // if it's already been signed...
        if (data.signature) {
            await web3.sendAndConfirmRawTransaction(connection, data.serialize());
        }
        await web3.sendAndConfirmTransaction(connection, data, [this.getKeyPair()]);
    }

    async createTx(
        amount: number | BigNumber,
        to: string,
        _fee?: string,
    ): Promise<{ txId: string; tx: any }> {
        const connection = this.providerInstance
        // TODO: figure out how to manually set fees?
        // TODO: figure out how to get the txId at creation time
        const keys = this.getKeyPair();

        const transaction = new web3.Transaction({
            recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
            feePayer: keys.publicKey,
        });

        transaction.add(
            web3.SystemProgram.transfer({
                fromPubkey: keys.publicKey,
                toPubkey: new web3.PublicKey(to),
                lamports: +amount,
            }),
        );

        const transactionBuffer = transaction.serializeMessage();
        const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
        transaction.addSignature(keys.publicKey, Buffer.from(signature));
        return { tx: transaction, txId: bs58.encode(signature) };
    }

    async getPublicKey(): Promise<string | Buffer> {
        // derive from privkey to ensure it's correct.
        const key = this.getKeyPair();
        return key.publicKey.toBuffer();
    }

}
