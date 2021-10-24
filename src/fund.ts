import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKPublicInterface } from "arweave/node/lib/wallet";

export default class Fund {
    private utils;
    private readonly jwk;

    constructor(utils, jwk: JWKPublicInterface) {
        this.utils = utils;
        this.jwk = jwk;
    }

    /**
     * Create a Arweave TX to send amount winston to the bundler
     * @param amount the amount to send in winston
     * @returns the Arweave transaction
     */
    public async fund(amount: number): Promise<Transaction> {
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
        await arweave.transactions.sign(tx, this.jwk);
        await arweave.transactions.post(tx);
        return tx;
    }

}
