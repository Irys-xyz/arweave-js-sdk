import Utils from "./utils";

export default class Fund {
    private utils: Utils;

    constructor(utils: Utils) {
        this.utils = utils;
    }

    public async fund(amount: number, multiplier = 1.0): Promise<any> {
        if (!Number.isInteger(amount)) { throw new Error("must use an integer for funding amount") }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        const fee = ((await c.getFee(amount, to)).multipliedBy(multiplier)).toString();
        const tx = await c.createTx({ amount, fee: fee.toString(), to }, c.account.key)
        await c.sendTx(tx.tx);
        if (this.utils.currency == "matic") {
            await this.utils.api.post("/account/balance/matic", { tx_id: tx.txId });
        }
        return { reward: fee, target: to, quantity: amount, id: tx.txId };
    }
}