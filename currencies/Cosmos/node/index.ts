import BigNumber from "bignumber.js";
import { Signer } from "@bundlr-network/client/build/cjs/common/signing/index"
import { CosmosSigner } from "./CosmosSigner";
import { CurrencyConfig, Tx } from "@bundlr-network/client/build/cjs/common/types";
import BaseNodeCurrency from "@bundlr-network/client/build/cjs/node/currency";
import NodeBundlr from "@bundlr-network/client/build/cjs/node/index";
import { getRedstonePrice } from "@bundlr-network/client/build/cjs/node/currency";

import * as stargate from "@cosmjs/stargate";
import * as amino from "@cosmjs/amino";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { HdPath, Slip10RawIndex } from "@cosmjs/crypto";

export interface CosmosCurrencyConfig extends CurrencyConfig { 
    localConfig: {
        prefix: string,
        derivePath: string,
        fee: string,
        denomination: string,
        decimals: number
    };
}
export default class CosmosConfig extends BaseNodeCurrency {

    protected keyPair;
    protected providerInstance?;
    protected signerInstance: CosmosSigner;
    private localConfig: {
        prefix: string,
        derivePath: string,
        fee: string,
        denomination: string,
        decimals: number
    };

    sleep = (ms): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    constructor(config: CosmosCurrencyConfig) {
        super(config);
        this.localConfig = config.localConfig;
        this.base = [this.localConfig.denomination, this.localConfig.decimals];
        this._address = "You need to .ready() this currency!"
    }

    protected async getProvider(): Promise<any> {
        const path: HdPath = [
            Slip10RawIndex.hardened(44),
            Slip10RawIndex.hardened(new BigNumber(this.localConfig.derivePath).toNumber()),
            Slip10RawIndex.hardened(0),
            Slip10RawIndex.normal(0),
            Slip10RawIndex.normal(0),
          ];
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.wallet, { "prefix": this.localConfig.prefix, "hdPaths": [path] } );
        if (!this.providerInstance) {
            this.providerInstance = await stargate.SigningStargateClient.connectWithSigner(
                this.providerUrl,
                wallet
              );
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider();
        const transaction = await provider.getTx(txId);
        const rawlog = JSON.parse(transaction.rawLog);
        const confirmed = (transaction.code === 0);
        let tx;
         if(this.name === "akash"){
            tx = {
                from: rawlog[0].events[1].attributes[1].value,
                to: rawlog[0].events[1].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[1].attributes[2].value.slice(0,-(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        }else{
            tx = {
                from: rawlog[0].events[3].attributes[1].value,
                to: rawlog[0].events[3].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[3].attributes[2].value.slice(0,-(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        }
        return tx;
    }
    
    ownerToAddress(owner: any): string {
        const encodePubkey = amino.encodeSecp256k1Pubkey(owner);
        const address = amino.pubkeyToAddress(encodePubkey, this.localConfig.prefix);
        return address;
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return await this.getSigner().sign(data);
    }

    getSigner(): Signer {
        return this.signerInstance;
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return CosmosSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        return await provider.getHeight();
    }

    async getFee(): Promise<BigNumber> {
        return new BigNumber(this.localConfig.fee);
    }

    async sendTx(data: any): Promise<string> {
        const send = await (await this.getProvider()).broadcastTx(data, 60000, 3000);
        return send.transactionHash;
    }

    async createTx(amount: BigNumber.Value, to: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        const account = this.ownerToAddress(this.getPublicKey());

        const sendingAmount = {
            denom: this.base[0],
            amount: amount.toString(),
          };

        const sendingFee = {
            amount: [
                {
                denom: this.base[0],
                amount: this.localConfig.fee,
                },
            ],
            gas: "100000",
        };

        const sendMsg: stargate.MsgSendEncodeObject = {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: account,
            toAddress: to,
            amount: [sendingAmount],
          }
        };
        const signedTx = await provider.sign(account, [sendMsg], sendingFee, "");
        const txBytes = TxRaw.encode(signedTx).finish();

        return { tx: txBytes, txId: null };
    }

    getPublicKey(): string | Buffer{
        const pk = this.signerInstance.pk;
        return pk;
    }

    async ready(): Promise<boolean> {
        this.signerInstance = new CosmosSigner(this.wallet, this.localConfig.derivePath);
        await this.signerInstance.ready();
        this.assignAddress();
        return true;
    }

    public async getGas(): Promise<[BigNumber, number]> {
        return [new BigNumber(await getRedstonePrice("ATOM")), 1e6]
    }

}

export class CosmosBundlr extends NodeBundlr {
    public static readonly currency = "cosmos"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new CosmosConfig({ name: "cosmos", ticker: "ATOM", providerUrl: config?.providerUrl ?? "https://rpc.cosmos.network", wallet, localConfig: { prefix: "atom", "derivePath": "118", "fee": "2500", "denomination": "uatom", "decimals": 1e6 } })
        super(url, currencyConfig, config)
    }
}
export class AkashBundlr extends NodeBundlr {
    public static readonly currency = "akash"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new CosmosConfig({ name: "akash", ticker: "AKT", providerUrl: config?.providerUrl ?? "https://rpc.akash.forbole.com", wallet, localConfig: { prefix: "akash", "derivePath": "118", "fee": "100", "denomination": "uakt", "decimals": 1e6 } })
        super(url, currencyConfig, config)
    }
}
export class TerraBundlr extends NodeBundlr {
    public static readonly currency = "terra"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new CosmosConfig({ name: "terra", ticker: "LUNA", providerUrl: config?.providerUrl ?? "https://terra-rpc.easy2stake.com", wallet, localConfig: { prefix: "terra", "derivePath": "330", "fee": "1200", "denomination": "uluna", "decimals": 1e6 } })
        super(url, currencyConfig, config)
    }
}
export class UstBundlr extends NodeBundlr {
    public static readonly currency = "ust"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new CosmosConfig({ name: "ust", ticker: "UST", providerUrl: config?.providerUrl ?? "https://terra-rpc.easy2stake.com", wallet, localConfig: { prefix: "terra", "derivePath": "330", "fee": "50000", "denomination": "uusd", "decimals": 1e6 } })
        super(url, currencyConfig, config)
    }
}
export class KyveBundlr extends NodeBundlr {
    public static readonly currency = "kyve"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const k = new CosmosConfig({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: config?.providerUrl ?? "https://rpc.node.kyve.network", wallet, localConfig: { prefix: "kyve", "derivePath": "118", "fee": "1", "denomination": "kyve", "decimals": 1e9 } })
        k.price = async (): Promise<number> => { return 1 } // TODO: replace for mainnet
        k.getGas = async (): Promise<[BigNumber, number]> => { return [new BigNumber(100), 1e18] }
        const currencyConfig = k;
        super(url, currencyConfig, config)
    }
}