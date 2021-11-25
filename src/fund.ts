import Utils from "./utils";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export default class Fund {
    private utils: Utils;

    constructor(utils: Utils) {
        this.utils = utils;
    }

    public async fund(amount: number, multiplier = 1.0): Promise<any> {
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
        Utils.checkAndThrow(nres);
        await sleep(500); // sleep so the chain has enough time to sync so the bundler doesn't erroneously reject.
        const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId });
        Utils.checkAndThrow(bres);
        return { reward: fee, target: to, quantity: amount, id: tx.txId };
    }
}
