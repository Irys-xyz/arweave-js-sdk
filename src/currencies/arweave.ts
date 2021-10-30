import BigNumber from "bignumber.js";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import Bundlr from "../bundlr";
import Api from "arweave/node/lib/api";
import base64url from "base64url";
import { getRedstonePrice } from ".";

export default class Config {
    private arweave: Arweave;
    private readonly wallet: { address: string, key: JWKInterface };
    private api: Api;
    public base
    public account
    constructor(bundlr: Bundlr) {
        this.api = bundlr.api;
        this.arweave = new Arweave({ ...this.api.getConfig() });
        this.wallet = bundlr.wallet;
        this.base = ["winston", 1e12]
        this.account = { key: this.wallet, address: this.wallet.address }

    }

    public async getTX() { return undefined }
    public async ownerToAddress(owner) { return this.arweave.wallets.ownerToAddress(Buffer.isBuffer(owner) ? base64url(owner) : owner); }
    public async getId(item) { return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature()))); }
    public async price() { return getRedstonePrice("AR"); }
    public async sign(data) { return Arweave.crypto.sign(this.wallet.key, data) }
    public async verify(pub, data, sig) { return Arweave.crypto.verify(pub, data, sig) }
    public async getCurrentHeight() { this.arweave.network.getInfo().then(r => new BigNumber(r.height)) }
    public async getReward(amount) { return new BigNumber(parseInt(await this.arweave.transactions.getPrice(amount))) }
    public async endTx(tx) { return await this.arweave.transactions.post(tx) }
    public async createTx(data, key) {
        const tx = await this.arweave.createTransaction({ ...data }, key)
        await this.arweave.transactions.sign(tx, key)
        return tx;
    }
}