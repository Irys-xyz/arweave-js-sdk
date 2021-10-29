import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKPublicInterface } from "arweave/node/lib/wallet";
import Utils from "./utils";

export default class Fund {
    private utils: Utils;
    private readonly jwk: JWKPublicInterface;

    constructor(utils: Utils, jwk: JWKPublicInterface) {
        this.utils = utils;
        this.jwk = jwk;
    }

    /**
     * Create a Arweave TX to send amount winston to the bundler
     * @param amount the amount to send in winston
     * @returns the Arweave transaction
     */
    public async fund(amount: number, multiplier = 1.0): Promise<Transaction> {
        if (!Number.isInteger(amount)) throw new Error(`Must use an integer when funding a bundler. You tried with ${amount}`);
        const arweave = Arweave.init({
            host: "arweave.net",
            port: "443",
            protocol: "https",
            timeout: 10000
        });
        const tx = await arweave.createTransaction({
            target: await this.utils.getBundlerAddress(),
            quantity: amount.toString()
        }, this.jwk);
        tx.reward = Math.max(Math.ceil(parseInt(tx.reward) * multiplier), parseInt(tx.reward)).toString();
        await arweave.transactions.sign(tx, this.jwk);
        await arweave.transactions.post(tx);
        return tx;
    }

}
