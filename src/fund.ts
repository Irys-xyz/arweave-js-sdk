import Utils from "./utils";

export default class Fund {
    private utils: Utils;

    constructor(utils: Utils) {
        this.utils = utils;
    }

    public async fund(amount: number, multiplier = 1.0): Promise<{
        reward: string,
        target: string,
        quantity: number,
        id: string
    }> {
        if (!Number.isInteger(amount)) { throw new Error("must use an integer for funding amount") }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        let baseFee;
        if (c.base[0] === "winston") {
            baseFee = await c.getFee(0, to)
        } else {
            baseFee = await c.getFee(amount, to)
        }
        const fee = (baseFee.multipliedBy(multiplier)).toFixed(0).toString();
        const tx = await c.createTx(amount, to, fee.toString())
        const nres = await c.sendTx(tx.tx);
        console.log(tx.txId);
        Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId });
        Utils.checkAndThrow(bres, "Posting transaction information to the bundler");
        return { reward: fee, target: to, quantity: amount, id: tx.txId };
    }
}
