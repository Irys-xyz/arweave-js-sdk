import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types"
import BaseNodeCurrency from "../currency"
import { KeyPair, connect, Near } from "near-api-js"
import { decode } from "bs58";

// export interface NearCurrencyConfig extends CurrencyConfig {
//     networkId: string
//     headers: [key: string]: string | number;
// }

export default class NearConfig extends BaseNodeCurrency {
    protected keyStore: KeyPair
    protected keyPair: KeyPair
    protected providerInstance?: Near

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["yoctoNEAR", 1e25]
        this.keyPair = KeyPair.fromString(this.wallet)
    }



    protected async getProvider(): Promise<Near> {
        if (!this.providerInstance) {
            this.providerInstance = await connect({ nodeUrl: this.providerUrl, networkId: this.providerUrl == "https://rpc.mainnet.near.org" ? "mainnet" : "testnet", headers: {} })
        }
        return this.providerInstance
    }

    /**
     * NEAR wants both the sender ID and tx Hash, so we have to concatenate to keep with the interface.
     * @param txId assumes format senderID:txHash
     */
    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider()
        const [id, hash] = txId.split(":");
        const res = await provider.connection.provider.txStatus(hash, id)
        return {
            from: "id",
            to: res.transaction.reciever_id,
            amount: new BigNumber(0),
            blockHeight: new BigNumber(0),
            pending: true,
            confirmed: false
        }
    }

    /**
     * Able to derive accountID from accountID, Trust wallet address or Pubkey
     * @param data 
     * @returns 
     */
    private getAccountId(data): string {
        if (data.toLowerCase().endsWith(".near")) {
            return data.replace("@", "").replace("https://wallet.near.org/send-money/", "").toLowerCase();
        }
        if (data.length == 64 && !data.startsWith("ed25519:")) {
            return data;
        }
        let publicKey;
        if (data.startsWith("NEAR")) {
            publicKey = decode(data.slice(4)).slice(0, -4);
        } else {
            publicKey = decode(data.replace("ed25519:", ""));
        }
        return publicKey.toString("hex");
    }

    /**
     * address = accountID
     * @param owner // assumed to be the "ed25519:" header + b58 encoded key 
     */
    ownerToAddress(owner: any): string {
        return this.getAccountId(owner)
        // return decode(owner.replace("ed25519:", "")).toString("hex");
    }

    // TODO: Implement following via arbundles
    sign(_data: Uint8Array): Promise<Uint8Array> {
        throw new Error("Method not implemented.");
    }

    getSigner(): Signer {
        throw new Error("Method not implemented.");
    }

    verify(_pub: any, _data: Uint8Array, _signature: Uint8Array): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        const res = await provider.connection.provider.status();
        return new BigNumber(res.sync_info.latest_block_height);
    }

    async getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        const provider = await this.getProvider();
        // one unit of gas
        // const res = await provider.connection.provider.gasPrice(await (await this.getCurrentHeight()).toNumber())
        const res = await provider.connection.provider.gasPrice(null) // null == gas price as of latest block
        // multiply by action cost in gas units (assume only action is transfer)
        // 4.5x10^11 gas units for fund transfers
        return new BigNumber(res.gas_price).multipliedBy(4.5e11)
        // return new BigNumber(res.gas_price);
    }
    sendTx(_data: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    createTx(_amount: BigNumber.Value, _to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        throw new Error("Method not implemented.");
    }
    getPublicKey(): string | Buffer {
        return Buffer.from(this.keyPair.getPublicKey().data)

    }
}