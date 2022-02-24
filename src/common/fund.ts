import BigNumber from "bignumber.js";
import { FundData } from "./types";
import Utils from "./utils";

export default class Fund {
    protected utils: Utils;

    constructor(utils: Utils) {
        this.utils = utils;
    }

    /**
     * Function to Fund (send funds to) a Bundlr node - inherits instance currency and node
     * @param amount - amount in base units to send
     * @param multiplier - network tx fee multiplier - only works for specific currencies
     * @returns  - funding receipt
     */
    public async fund(amount: BigNumber.Value, multiplier = 1.0): Promise<FundData> {
        console.log(amount);
        const _amount = new BigNumber(amount)
        if (!_amount.isInteger()) { throw new Error("must use an integer for funding amount") }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        console.log(to);

        // winston's fee is actually for amount of data, not funds, so we have to 0 this.
        console.log("get fee");

        const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to);
        console.log("got fee");

        const fee = (baseFee.multipliedBy(multiplier)).toFixed(0).toString();
        console.log("Creating");

        const tx = await c.createTx(_amount, to, fee);
        console.log("Sending");
        const nres = await c.sendTx(tx.tx);
        console.log("Sent");
        // tx.txId = nres ?? tx.txId;
        if (!tx.txId) {
            tx.txId = nres;
        }

        Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        await this.utils.confirmationPoll(tx.txId);
        const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId })
            .catch(_ => { throw new Error(`failed to post funding tx - ${tx.txId} - keep this id!`) })
        Utils.checkAndThrow(bres, `Posting transaction ${tx.txId} information to the bundler`, [202]);
        return { reward: fee, target: to, quantity: _amount.toString(), id: tx.txId };
    }
}
