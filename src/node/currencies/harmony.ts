import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"
import { getRedstonePrice } from "../currency";

import { Account } from "@harmony-js/account";
import { Messenger, HttpProvider/* , WSProvider */ } from "@harmony-js/network";
import { Harmony } from "@harmony-js/core";
import { getAddressFromPublicKey, getPubkeyFromPrivateKey, getAddress } from "@harmony-js/crypto";
import { TransactionFactory } from "@harmony-js/transaction";
import {
    ChainID,
    ChainType,
    hexToBN,
    // numberToHex,
    // fromWei,
    // Units,
    Unit,
  } from "@harmony-js/utils";

// import { HarmonySigner } from "arbundles/src/signing";
import { signers } from "arbundles";
const ethereumSigner = signers.EthereumSigner;

export default class HarmonyConfig extends BaseNodeCurrency {

    protected keyPair;
    protected providerInstance?;
    protected signerInstance;

    sleep = (ms): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["One", 1e6]
        this.assignAddress();
    }

    protected async getProvider(): Promise<any> {
        if (!this.providerInstance) {
            this.providerInstance = new Harmony(
                this.providerUrl,
                {
                    chainType: ChainType.Harmony,
                    chainId: ChainID.HmyTestnet,
                },
            );
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider();
        const status = await provider.blockchain.getTransactionReceipt({ txnHash: txId });
        const transaction = await provider.blockchain.getTransactionByHash({ txnHash: txId });
        const tx = {
            from: transaction.result.from,
            to: transaction.result.to,
            amount: new BigNumber(transaction.result.value),
            blockHeight: new BigNumber(transaction.result.blockNumber),
            pending: status.result.status === "0x0",
            confirmed: status.result.status === "0x1"
        };
        return tx;
    }
    
    ownerToAddress(owner: any): string {
        return getAddress(getAddressFromPublicKey(owner.toString())).bech32;
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = new ethereumSigner(this.wallet);
        return signer.sign(data);
    }

    getSigner(): Signer {
        return new ethereumSigner(this.wallet);
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return ethereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        return await provider.blockchain.getBlockNumber();
    }

    async getFee(): Promise<BigNumber> {
        return new BigNumber("630000000000000");
    }

    async sendTx(data: any): Promise<string> {
        const send = await (await this.getProvider()).blockchain.sendTransaction(data);
        return send.result;
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const messenger = new Messenger(
            new HttpProvider(this.providerUrl),
            ChainType.Harmony,
            ChainID.HmyTestnet,
          );
        const factory = new TransactionFactory(messenger);
        const account = new Account(
            this.wallet,
            messenger
        );

        const gas = await (await this.getProvider()).blockchain.gasPrice();
        const txn = factory.newTx({
            to: to,
            value: new Unit(amount.toString()).toWei(),
            // gas limit, you can use string
            gasLimit: "21000",
            // send token from shardID
            shardID: 0,
            // send token to toShardID
            toShardID: 0,
            // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
            gasPrice: hexToBN(gas.result),
          });

        const signedTx = await account.signTransaction(txn);

        return { tx: signedTx, txId: null };
    }

    getPublicKey(): string | Buffer{
        const pk = getPubkeyFromPrivateKey(this.wallet);
        return pk;
    }

    public async getGas(): Promise<[BigNumber, number]> {
        return [new BigNumber(await getRedstonePrice("ATOM")), 1e6]
    }

}