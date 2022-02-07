import BigNumber from "bignumber.js";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import SolanaConfig from "./solana";
import { CurrencyConfig, Tx } from "../../common/types";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import keys from "../../keys";

export interface SPLCurrencyConfig extends CurrencyConfig { contractAddress: string }

export default class SPLConfig extends SolanaConfig {
    private contractAddress: string;

    constructor(config: SPLCurrencyConfig) {
        super(config);
        this.base = ["lamports", 1e9];
        this.contractAddress = config.contractAddress;
    }

    async getContractDecimals(): Promise<number> {
        const contract = new web3.PublicKey(this.contractAddress);
        const connection = await this.getProvider();
        const accountInfo = await connection.getParsedAccountInfo(contract);
        const decimals = accountInfo.value.data["parsed"]["info"]["tokenAmount"]["decimals"];
        return await decimals.toNumber();
    }


    async getTx(txId: string): Promise<Tx> {
        const connection = await this.getProvider();
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
        return {
            from: stx.transaction.message.accountKeys[0].toBase58(),
            to: stx.transaction.message.accountKeys[1].toBase58(),
            amount,
            blockHeight: new BigNumber(stx.slot),
            pending: false,
            confirmed: confirmed || amount.lt(4e7, 10),
        };
    }

    async getFee(_amount: number | BigNumber, _to?: string): Promise<BigNumber> {
        const connection = await this.getProvider();
        const block = await connection.getRecentBlockhash();
        const feeCalc = await connection.getFeeCalculatorForBlockhash(
            block.blockhash,
        );
        return new BigNumber(feeCalc.value.lamportsPerSignature);
    }

    async createTx(
        amount: number | BigNumber,
        to: string,
        _fee?: string,
    ): Promise<{ txId: string; tx: any }> {
        const connection = await this.getProvider();
        // TODO: figure out how to manually set fees
        const keys = this.getKeyPair();

        const decimals = await this.getContractDecimals();

        const transaction = new web3.Transaction({
            recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
            feePayer: keys.publicKey,
        });
        const amountBeingSent = new BigNumber(amount.valueOf()).toNumber();
        transaction.add(
            Token.createTransferCheckedInstruction(
                TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
                keys.publicKey, // from (should be a token account)
                new web3.PublicKey(this.contractAddress), // contract address pubKey
                new web3.PublicKey(to), // to (should be a token account)
                keys.publicKey, // owner of from
                [], // for multisig account, leave empty.
                amountBeingSent, // amount, if your deciamls is 8, send 10^8 for 1 token
                decimals // decimals
              )
        );

        const transactionBuffer = transaction.serializeMessage();
        const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
        transaction.addSignature(keys.publicKey, Buffer.from(signature));
        return { tx: transaction, txId: bs58.encode(signature) };
    }

}
