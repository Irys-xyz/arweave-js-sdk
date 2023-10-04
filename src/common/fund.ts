import AsyncRetry from "async-retry";
import type { AxiosResponse } from "axios";
import BigNumber from "bignumber.js";
import type { FundResponse } from "./types";
import Utils from "./utils";

export default class Fund {
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
    const _amount = new BigNumber(amount);
    if (!_amount.isInteger()) {
      throw new Error("must use an integer for funding amount");
    }
    const c = this.utils.tokenConfig;
    const to = await this.utils.getBundlerAddress(this.utils.token);
    let fee!: object | BigNumber;
    if (c.needsFee) {
      // winston's fee is actually for amount of data, not funds, so we have to 0 this.
      const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to);
      fee = BigNumber.isBigNumber(baseFee) ? baseFee.multipliedBy(multiplier).integerValue(BigNumber.ROUND_CEIL) : baseFee;
    }
    const tx = await c.createTx(_amount, to, fee);
    let nres: any;
    // eslint-disable-next-line no-useless-catch
    try {
      nres = await c.sendTx(tx.tx);
    } catch (e: any) {
      throw e;
    }

    tx.txId ??= nres;

    if (!tx.txId) {
      throw new Error(`Undefined transaction ID`);
    }

    Utils.checkAndThrow(nres, `Sending transaction to the ${this.utils.token} network`);
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

    return { reward: BigNumber.isBigNumber(fee) ? fee.toString() : JSON.stringify(fee), target: to, quantity: _amount.toString(), id: tx.txId };
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
