import Arweave from "arweave";
import BaseCurrency from "../../common/currency";
import { ArweaveSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import crypto from "crypto";
import { CurrencyConfig, Tx } from "../../common/types";
import base64url from "base64url";


export default class ArweaveConfig extends BaseCurrency {
    protected providerInstance: Arweave;

    constructor(config: CurrencyConfig) {
        super(config)
        this.base = ["winston", 1e12];
    }

    public async ready(): Promise<void> {
        this.providerInstance = await Arweave.init({ host: this.providerUrl ?? "arweave.net", protocol: "https", port: 443 });
        await super.ready();
    }

    async getTx(txId: string): Promise<Tx> {
        const arweave = this.providerInstance
        const txs = await arweave.transactions.getStatus(txId);
        let tx;
        if (txs.status == 200) {
            tx = await arweave.transactions.get(txId)
        }
        const confirmed = (txs.status !== 202 && txs.confirmed?.number_of_confirmations >= 10)
        let owner;
        if (tx?.owner) {
            owner = this.ownerToAddress(tx.owner);
        }
        return {
            from: owner ?? undefined,
            to: tx?.target ?? undefined,
            amount: new BigNumber(tx?.quantity ?? 0),
            pending: (txs.status == 202),
            confirmed
        }
    }

    ownerToAddress(owner: any): string {

        return Arweave.utils.bufferTob64Url(crypto
            .createHash("sha256")
            .update((Arweave.utils.b64UrlToBuffer((Buffer.isBuffer(owner) ? base64url(owner) : owner))))
            .digest()
        )
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        return Arweave.crypto.sign(this.wallet, data);
    }

    getSigner(): Signer {
        return new ArweaveSigner(this.wallet);
    }

    async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        if (Buffer.isBuffer(pub)) {
            pub = pub.toString();
        }
        return Arweave.crypto.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        return this.providerInstance.network.getInfo().then(r => new BigNumber(r.height))
    }

    async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
        return new BigNumber(await this.providerInstance.transactions.getPrice((new BigNumber(amount)).toNumber(), to)).integerValue(BigNumber.ROUND_CEIL)
    }

    async sendTx(data: any): Promise<void> {
        const arweave = this.providerInstance
        await arweave.transactions.post(data);
    }

    async createTx(amount: BigNumber.Value, to: string, fee?: string): Promise<{ txId: string; tx: any; }> {
        const arweave = this.providerInstance
        const tx = await arweave.createTransaction({ quantity: (new BigNumber(amount)).toString(), reward: fee, target: to }, this.wallet)
        await arweave.transactions.sign(tx, this.wallet)
        return { txId: tx.id, tx };
    }

    async getPublicKey(): Promise<string> {
        return this.wallet.n
    }


}