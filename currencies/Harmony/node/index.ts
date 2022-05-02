import BigNumber from "bignumber.js";
import { Signer } from "@bundlr-network/client/build/cjs/common/signing/index"
import { CurrencyConfig, Tx } from "@bundlr-network/client/build/cjs/common/types";//
import BaseNodeCurrency from "@bundlr-network/client/build/cjs/node/currency";
import NodeBundlr from "@bundlr-network/client/build/cjs/node/index";

import { Account } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { Harmony } from "@harmony-js/core";
import { getAddress } from "@harmony-js/crypto";
import { TransactionFactory } from "@harmony-js/transaction";
import {
    ChainID,
    ChainType,
    hexToBN,
    Unit,
  } from "@harmony-js/utils";

import EthereumSigner from "./EthereumSigner"
import { publicKeyCreate } from "secp256k1";
import keccak256 from "./keccak256";

export default class HarmonyConfig extends BaseNodeCurrency {

    declare providerInstance?: Harmony;
    protected signerInstance?: EthereumSigner;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["One", 1e6]
        // this.assignAddress();
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
            from: getAddress(transaction.result.from).basicHex,
            to: transaction.result.to,
            amount: new BigNumber(transaction.result.value),
            blockHeight: new BigNumber(transaction.result.blockNumber),
            pending: status.result.status === "0x0",
            confirmed: status.result.status === "0x1"
        };
        return tx;
    }
    
    ownerToAddress(owner: any): string {
        return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = new EthereumSigner(this.wallet);
        return signer.sign(data);
    }

    getSigner(): Signer {
        if(!this.signerInstance){
            this.signerInstance = new EthereumSigner(this.wallet);
        }
        return this.signerInstance;
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return EthereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        return await provider.blockchain.getBlockNumber();
    }

    async getFee(): Promise<BigNumber> {
        const gas = await (await this.getProvider()).blockchain.gasPrice();
        return new BigNumber(gas.result*21000);
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
            to: getAddress(to).bech32,
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

        return { tx: signedTx, txId: "" };
    }

    getPublicKey(): string | Buffer{
        return Buffer.from(publicKeyCreate(Buffer.from(this.wallet, "hex"), false));
    }

}

export class HarmonyBundlr extends NodeBundlr {
    public static readonly currency = "harmony"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new HarmonyConfig({ name: "harmony", ticker: "ONE", providerUrl: config?.providerUrl ?? "https://api.s0.b.hmny.io", wallet });
        super(url, currencyConfig, config)
    }
}