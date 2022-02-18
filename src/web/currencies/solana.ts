import { InjectedSolanaSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseWebCurrency from "../currency";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import { MessageSignerWalletAdapter } from "@solana/wallet-adapter-base";

export default class SolanaConfig extends BaseWebCurrency {
    private signer: InjectedSolanaSigner
    protected wallet: MessageSignerWalletAdapter

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["lamports", 1e9];
    }

    private async getProvider(): Promise<web3.Connection> {
        if (!this.providerInstance) {
            this.providerInstance = new web3.Connection(
                this.providerUrl,
                "confirmed"
            );
        }
        return this.providerInstance;
    }


    async getTx(txId: string): Promise<Tx> {
        const connection = await this.getProvider()
        const stx = await connection.getTransaction(txId, {
            commitment: "confirmed",
        });
        if (!stx) throw new Error(`tx ${txId} not found`);

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
        if (typeof owner === "string") {
            owner = Buffer.from(owner)
        }
        return bs58.encode(owner);
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return await (await this.getSigner()).sign(data);
    }

    getSigner(): Signer {
        if (!this.signer) {
            this.signer = new InjectedSolanaSigner(this.wallet)
        }
        return this.signer;
    }

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return InjectedSolanaSigner.verify(pub, data, signature);
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

    async sendTx(data: any): Promise<string> {

        return await this.wallet.sendTransaction(data, await this.getProvider())

    }

    async createTx(
        amount: BigNumber.Value,
        to: string,
        _fee?: string,
    ): Promise<{ txId: string; tx: any }> {
        // TODO: figure out how to manually set fees
        const pubkey = new web3.PublicKey(await this.getPublicKey())

        const transaction = new web3.Transaction({
            recentBlockhash: (await (await this.getProvider()).getRecentBlockhash()).blockhash,
            feePayer: pubkey
        });

        transaction.add(
            web3.SystemProgram.transfer({
                fromPubkey: pubkey,
                toPubkey: new web3.PublicKey(to),
                lamports: +new BigNumber(amount).toNumber(),
            }),
        );

        return { tx: transaction, txId: undefined };
    }

    async getPublicKey(): Promise<string | Buffer> {
        return this.wallet.publicKey.toBuffer();
    }

}