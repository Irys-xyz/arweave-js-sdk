import AsyncRetry from "async-retry";
import BigNumber from "bignumber.js";
import { FundResponse } from "./types";
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
    public async fund(amount: BigNumber.Value, multiplier = 1.0): Promise<FundResponse> {
        const _amount = new BigNumber(amount);
        if (!_amount.isInteger()) { throw new Error("must use an integer for funding amount"); }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        let fee: Object | BigNumber;
        if (c.needsFee) {
            // winston's fee is actually for amount of data, not funds, so we have to 0 this.
            const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to);
            fee = BigNumber.isBigNumber(baseFee) ? (baseFee.multipliedBy(multiplier)).toFixed(0).toString() : baseFee;
        }
        const tx = await c.createTx(_amount, to, fee);
        let nres: any;
        // eslint-disable-next-line no-useless-catch
        try {
            nres = await c.sendTx(tx.tx);
        } catch (e) {
            throw e;
        }

        tx.txId ??= nres;

        if (!tx.txId) {
            throw new Error(`Undefined transaction ID`);
        }

        // console.log(tx.txId);

        Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        const confirmError = await this.utils.confirmationPoll(tx.txId);

        const bres = await AsyncRetry(
            async (bail) => {
                const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId });
                if (bres.status == 400) {
                    bail(new Error(`failed to post funding tx - ${tx.txId} (keep this id!) - ${bres.data} ${confirmError ? ` - ${confirmError?.message ?? confirmError}` : ""}`));
                }
                Utils.checkAndThrow(bres, `Posting transaction ${tx.txId} information to the bundler`, [202]);
                return bres;
            },
            {
                retries: 5,
                maxTimeout: 1000,
                minTimeout: 100,
                randomize: true
            }
        );

        if (!bres) {
            throw new Error(`failed to post funding tx - ${tx.txId} - keep this id! \n ${confirmError ? ` - ${confirmError?.message ?? confirmError}` : ""}`);
        }
        // const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId })
        //     .catch(_ => { throw new Error(`failed to post funding tx - ${tx.txId} - keep this id!`); });

        return { reward: BigNumber.isBigNumber(fee) ? fee.toString() : JSON.stringify(fee), target: to, quantity: _amount.toString(), id: tx.txId };
    }
}
