// import BigNumber from "bignumber.js";
// import Arweave from "arweave";
// import base64url from "base64url";
// import { getRedstonePrice, Tx } from ".";
// import { Currency } from "."
// class CurrencyArweave implements Currency {
//     public account;
//     public base
//     private arweave
//     constructor(account) {
//         this.account = account;
//         this.base = ["winston", 1e12];
//         this.arweave = new Arweave({ host: this.provider })
//     }
//     provider = "http://arweave.net";
//     async getTx() { return undefined }
//     async ownerToAddress(owner) { return this.arweave.wallets.ownerToAddress(Buffer.isBuffer(owner) ? base64url(owner) : owner); }
//     async getId(item) { return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature()))); }
//     async price() { return getRedstonePrice("AR"); }
//     async sign(key, data) { return Arweave.crypto.sign(key, data) }
//     async verify(pub, data, sig) { return Arweave.crypto.verify(pub, data, sig) }
//     async getCurrentHeight() { return new BigNumber((await this.arweave.network.getInfo()).height) }
//     async getReward(amount) { return new BigNumber(parseInt(await this.arweave.transactions.getPrice(amount))) }
//     async sendTx(tx) { return await this.arweave.transactions.post(tx) }
//     async createTx(data, key) {
//         const tx = await this.arweave.createTransaction({ ...data }, key)
//         await this.arweave.transactions.sign(tx, key)
//         return tx;
//     }
//     getPublicKey(key) { return key.n };

// }

// export default CurrencyArweave;