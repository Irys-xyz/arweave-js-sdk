import AsyncRetry from "async-retry";
import type { AxiosResponse } from "axios";
import BigNumber from "bignumber.js";
import type { FundResponse } from "./types";
import Utils from "./utils";

export class Fund {
  protected utils: Utils;

  constructor(utils: Utils) {
    this.utils = utils;
  }

  /**
   * Function to Fund (send funds to) a Irys node - inherits instance token and node
   * @param amount - amount in base units to send
   * @param multiplier - network tx fee multiplier - only works for specific currencies
   * @returns  - funding receipt
   */
  public async fund(amount: BigNumber.Value, multiplier = 1.0): Promise<FundResponse> {
    amount = new BigNumber(amount);
    if (!amount.isInteger()) {
      throw new Error("must use an integer for funding amount");
    }
    const c = this.utils.tokenConfig;
    const to = await this.utils.getBundlerAddress(this.utils.token);
    let fee = c.needsFee ? await c.getFee(amount, to, multiplier) : undefined;
    // if fee is defined, is a bigNumber, and getFee doesn't accept the multiplier arg, apply multiplier here.
    // tokens should now handle multipliers within getFee, this is a temporary transitionary measure.
    if (fee && BigNumber.isBigNumber(fee) && c.getFee.length < 3) fee = fee.multipliedBy(multiplier).integerValue();
    const tx = await c.createTx(amount, to, fee);
    const sendTxRes = await c.sendTx(tx.tx);
    tx.txId ??= sendTxRes;

    if (!tx.txId) throw new Error(`Undefined transaction ID`);

    // Utils.checkAndThrow(sendTxRes, `Sending transaction to the ${this.utils.token} network`);
    let confirmError = await this.utils.confirmationPoll(tx.txId);
    const bres = await this.submitTransaction(tx.txId).catch((e) => {
      confirmError = e;
      return undefined;
    });
    if (!bres) {
      throw new Error(
        `failed to post funding tx - ${tx.txId} - keep this id! \n ${confirmError ? ` - ${confirmError?.message ?? confirmError}` : ""}`,
      );
    }

    return { reward: BigNumber.isBigNumber(fee) ? fee.toString() : JSON.stringify(fee), target: to, quantity: amount.toString(), id: tx.txId };
  }

  private async submitTransaction(transactionId: string): Promise<AxiosResponse> {
    return await AsyncRetry(
      async () => {
        const bres = await this.utils.api.post(`/account/balance/${this.utils.token}`, { tx_id: transactionId });
        Utils.checkAndThrow(bres, `Posting transaction ${transactionId} information to the bundler`, [202]);
        return bres;
      },
      {
        retries: 5,
        maxTimeout: 1000,
        minTimeout: 100,
        randomize: true,
      },
    );
  }

  public async submitFundTransaction(transactionId: string): Promise<AxiosResponse> {
    return this.submitTransaction(transactionId);
  }
}

export default Fund;
