//import Arweave from "arweave";
//import Transaction from "arweave/node/lib/transaction";
//import { JWKPublicInterface } from "arweave/node/lib/wallet";
//import BigNumber from "bignumber.js";
import Utils from "./utils";

export default class Fund {
    private utils: Utils;
    //private readonly jwk: JWKPublicInterface;

    constructor(utils: Utils) {
        this.utils = utils;
        //this.jwk = jwk;
    }

    public async fund(amount: number, multiplier = 1.0) {
        if (!Number.isInteger(amount)) { throw new Error("must use an integer for funding amount") }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress("matic");
        const fee = ((await c.getFee(amount, to)).multipliedBy(multiplier)).toString();
        console.log(`Fee for sending ${amount} ${c.base[0]} to ${to} is ${fee}`)
        const tx = await c.createTx({ amount, fee: fee.toString(), to }, c.account.key)
        console.log(JSON.stringify(tx));
        await c.sendTx(tx.tx);
        if (this.utils.currency == "matic") {
            const res = await this.utils.api.post("/account/balance/matic", { tx_id: tx.tx });
            console.log(res);
        }
        return tx;
    }

    // /**
    //  * Create a Arweave TX to send amount winston to the bundler
    //  * @param amount the amount to send in winston
    //  * @returns the Arweave transaction
    //  */
    // public async fund(amount: number, multiplier = 1.0): Promise<Transaction> {
    //     if (!Number.isInteger(amount)) throw new Error(`Must use an integer when funding a bundler. You tried with ${amount}`);
    //     const arweave = Arweave.init({
    //         host: "arweave.net",
    //         port: "443",
    //         protocol: "https",
    //         timeout: 30000
    //     });
    //     const tx = await arweave.createTransaction({
    //         target: await this.utils.getBundlerAddress("arweave"),
    //         quantity: amount.toString()
    //     }, this.jwk);
    //     tx.reward = Math.max(Math.ceil(parseInt(tx.reward) * multiplier), parseInt(tx.reward)).toString();
    //     await arweave.transactions.sign(tx, this.jwk);
    //     await arweave.transactions.post(tx);
    //     return tx;
    // }




}
