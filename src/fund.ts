import Arweave from "arweave";
import { JWKPublicInterface } from "arweave/node/lib/wallet";

export default class Fund {
    private utils;
    private readonly jwk;

    constructor(utils, jwk: JWKPublicInterface) {
        this.utils = utils;
        this.jwk = jwk;
    }

    public async fund(amount) {
        const arweave = Arweave.init({
            host: "arweave.net",
            port: "443",
            protocol: "https",
            timeout: 10000
        });
        const tx = await arweave.createTransaction({
            target: await this.utils.getBundlerAddress(),
            quantity: amount
        }, this.jwk);
        await arweave.transactions.sign(tx, this.jwk);
        await arweave.transactions.post(tx);
        return tx;
    }

}
