import BigNumber from "bignumber.js";
import CosmosSigner from "./CosmosSigner";
import { CurrencyConfig, Tx } from "@bundlr-network/client/build/cjs/common/types";
import BaseNodeCurrency from "@bundlr-network/client/build/cjs/node/currency";
import NodeBundlr from "@bundlr-network/client/build/cjs/node/index";
import { getRedstonePrice } from "@bundlr-network/client/build/cjs/node/currency";

import * as stargate from "@cosmjs/stargate";
import * as amino from "@cosmjs/amino";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import {
    HdPath,
    Slip10RawIndex,
    Secp256k1,
    EnglishMnemonic,
    Slip10,
    Slip10Curve,
    Secp256k1Keypair,

} from "@cosmjs/crypto";
import { toUtf8, fromHex } from "@cosmjs/encoding"
import Crypto from "crypto"
import { ec } from "elliptic"
import BN from "bn.js";

export interface CosmosCurrencyConfig extends CurrencyConfig {
    localConfig: {
        prefix: string,
        derivePath: string,
        fee: string,
        denomination: string,
        decimals: number,
    };
}
export default class CosmosConfig extends BaseNodeCurrency {

    declare protected keyPair: Secp256k1Keypair;
    declare protected providerInstance: stargate.SigningStargateClient;
    declare signerInstance: CosmosSigner;

    private localConfig: {
        prefix: string,
        derivePath: string,
        fee: string,
        denomination: string,
        decimals: number
    };
    declare public path: HdPath;


    constructor(config: CosmosCurrencyConfig) {
        super(config);
        this.localConfig = config.localConfig;
        this.base = [this.localConfig.denomination, this.localConfig.decimals];
        const path2number = new BigNumber(this.localConfig.derivePath).toNumber();
        this.path = [
            Slip10RawIndex.hardened(44),
            Slip10RawIndex.hardened(path2number),
            Slip10RawIndex.hardened(0),
            Slip10RawIndex.normal(0),
            Slip10RawIndex.normal(0),
        ];
        // const walletSeed = await Bip39.mnemonicToSeed(new EnglishMnemonic(this.wallet));
        const mnemonicBytes = toUtf8(new EnglishMnemonic(this.wallet).toString().normalize("NFKD"))
        const salt = "mnemonic" //no password
        const saltBytes = toUtf8(salt)
        const walletSeed = Crypto.pbkdf2Sync(mnemonicBytes, saltBytes, 2048, 64, "sha512")
        const slip = Slip10.derivePath(Slip10Curve.Secp256k1, walletSeed, this.path);
        const privkey = slip.privkey
        const secp256k1 = new ec("secp256k1")
        const secp256k1N = new BN("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", "hex")
        if (privkey.length !== 32) {
            throw new Error("input data is not a valid secp256k1 private key");
        }
        const keypair = secp256k1.keyFromPrivate(privkey);
        if (keypair.validate().result !== true) {
            throw new Error("input data is not a valid secp256k1 private key");
        }

        const privkeyAsBigInteger = new BN(privkey);
        if (privkeyAsBigInteger.gte(secp256k1N)) {
            throw new Error("input data is not a valid secp256k1 private key");
        }
        this.keyPair = {
            privkey: fromHex(keypair.getPrivate("hex")),
            pubkey: Uint8Array.from(keypair.getPublic("array")),
        };
        // this.keyPair = await Secp256k1.makeKeypair(slip.privkey);
        this.signerInstance = new CosmosSigner(this.keyPair.privkey, this.localConfig.prefix);
        this._address = this.ownerToAddress(this.keyPair.pubkey);
    }

    protected async getProvider(): Promise<stargate.SigningStargateClient> {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.wallet, { "prefix": this.localConfig.prefix, "hdPaths": [this.path] });
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
        if (!transaction) {
            throw new Error(`Could not get cosmos transaction ${txId}`)
        }
        const rawlog = JSON.parse(transaction.rawLog);
        const confirmed = (transaction.code === 0);
        let tx;
        if (this.name === "akash") {
            tx = {
                from: rawlog[0].events[1].attributes[1].value,
                to: rawlog[0].events[1].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[1].attributes[2].value.slice(0, -(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        } else {
            tx = {
                from: rawlog[0].events[3].attributes[1].value,
                to: rawlog[0].events[3].attributes[0].value,
                amount: new BigNumber(rawlog[0].events[3].attributes[2].value.slice(0, -(this.base[0].length))),
                blockHeight: new BigNumber(transaction.height),
                pending: false,
                confirmed: confirmed
            };
        }
        return tx;
    }

    ownerToAddress(owner: any): string {
        const compressed = Secp256k1.compressPubkey(owner);
        const encodePubkey = amino.encodeSecp256k1Pubkey(compressed);
        const address = amino.pubkeyToAddress(encodePubkey, this.localConfig.prefix);
        return address;
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return await this.getSigner().sign(data);
    }

    getSigner(): CosmosSigner {
        if (!this.signerInstance) {
            this.ready();
        }
        return this.signerInstance;
    }

    async verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return CosmosSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        return new BigNumber(await provider.getHeight())
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

        return { tx: txBytes, txId: "" };
    }

    getPublicKey(): string | Buffer {
        const signer = this.getSigner();
        // const pk = Secp256k1.compressPubkey(signer.publicKey);
        const pk = signer.publicKey;
        return Buffer.from(pk);
    }

    public async getGas(): Promise<[BigNumber, number]> {
        return [new BigNumber(await getRedstonePrice("ATOM")), 1e6]
    }

}

export class CosmosBundlr extends NodeBundlr {
    public static readonly currency = "cosmos"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new CosmosConfig({ name: "cosmos", ticker: "ATOM", providerUrl: config?.providerUrl ?? "https://rpc.cosmos.network", wallet, localConfig: { prefix: "cosmos", "derivePath": "118", "fee": "2500", "denomination": "uatom", "decimals": 1e6 } })
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
export class KyveBundlr extends NodeBundlr {
    public static readonly currency = "kyve"
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const k = new CosmosConfig({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: config?.providerUrl ?? "https://rpc.korellia.kyve.network/", wallet, localConfig: { prefix: "kyve", "derivePath": "118", "fee": "1", "denomination": "tkyve", "decimals": 1e9 } })
        k.price = async (): Promise<number> => { return 0.01 } // TODO: replace for mainnet
        k.getGas = async (): Promise<[BigNumber, number]> => { return [new BigNumber(100), 1e18] }
        const currencyConfig = k;
        super(url, currencyConfig, config)
    }
}