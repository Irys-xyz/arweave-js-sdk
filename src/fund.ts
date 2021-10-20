import Arweave from "arweave";

export default class Fund {
    private config;
    private gatewayConfig
    private utils;
    constructor(config, utils) {
        this.config = config;
        this.gatewayConfig = config.gatewayConfig;
        this.utils = utils


    }
    public async fund(amount) {
        const arweave = Arweave.init(this.gatewayConfig);
        const tx = await arweave.createTransaction({
            target: await this.utils.getBundlerAddress(),
            quantity: amount
        }, this.config.wallet);
        await arweave.transactions.sign(tx, this.config.wallet);
        await arweave.transactions.post(tx);
        return tx;
    }

}