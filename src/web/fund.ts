import BigNumber from "bignumber.js";
import Fund from "../common/fund";
import { FundData } from "../common/types";
import Utils from "../common/utils";

export default class WebFund extends Fund {

    constructor(utils: Utils) {
        super(utils)
    }

    public async fund(amount: BigNumber.Value, multiplier = 1.0): Promise<FundData> {
        const _amount = new BigNumber(amount)
        if (!_amount.isInteger()) { throw new Error("must use an integer for funding amount") }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to)
        const fee = (baseFee.multipliedBy(multiplier)).toFixed(0).toString();
        const tx = await c.createTx(_amount, to, fee.toString());
        tx.txId = await c.sendTx(tx.tx);
        await this.utils.confirmationPoll(tx.txId)
        const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId });
        Utils.checkAndThrow(bres, "Posting transaction information to the bundler");
        return { reward: fee, target: to, quantity: _amount.toString(), id: tx.txId };
    }
}