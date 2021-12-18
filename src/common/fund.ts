import BigNumber from "bignumber.js";
import Utils from "./utils";

export default class Fund {
    protected utils: Utils;

    constructor(utils: Utils) {
        this.utils = utils;
    }

    public async fund(amount: BigNumber, multiplier = 1.0): Promise<any> {
        if (!amount.isInteger()) { throw new Error("must use an integer for funding amount") }
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
        Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        await this.utils.confirmationPoll(tx.txId)
        const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId })
            .catch(_ => { throw new Error(`failed to post funding tx - ${tx.txId} - keep this id!`) })
        Utils.checkAndThrow(bres, "Posting transaction information to the bundler");
        return { reward: fee, target: to, quantity: amount, id: tx.txId };
    }
}
