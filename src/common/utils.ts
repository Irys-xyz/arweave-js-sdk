// import Api from "arweave/node/lib/api";
import { deepHash } from "arbundles";
import Arweave from "arweave";
import type { AxiosResponse } from "axios";
import base64url from "base64url";
import BigNumber from "bignumber.js";
import type Api from "./api";
import type { Currency, UploadReceipt } from "./types";
BigNumber.set({ DECIMAL_PLACES: 50 });

export const sleep = (ms): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default class Utils {
  public api: Api;
  public currency: string;
  public currencyConfig: Currency;
  constructor(api: Api, currency: string, currencyConfig: Currency) {
    this.api = api;
    this.currency = currency;
    this.currencyConfig = currencyConfig;
  }

  /**
   * Throws an error if the provided axios reponse has a status code != 200
   * @param res an axios response
   * @returns nothing if the status code is 200
   */
  public static checkAndThrow(res: AxiosResponse, context?: string, exceptions?: number[]): void {
    if (res?.status && !(exceptions ?? []).includes(res.status) && res.status != 200) {
      throw new Error(`HTTP Error: ${context}: ${res.status} ${typeof res.data !== "string" ? res.statusText : res.data}`);
    }
    return;
  }

  /**
   * Gets the nonce used for withdrawal request validation from the bundler
   * @returns nonce for the current user
   */
  public async getNonce(): Promise<number> {
    const res = await this.api.get(`/account/withdrawals/${this.currencyConfig.name}?address=${this.currencyConfig.address}`);
    Utils.checkAndThrow(res, "Getting withdrawal nonce");
    return res.data;
  }

  /**
   * Gets the balance on the current bundler for the specified user
   * @param address the user's address to query
   * @returns the balance in winston
   */
  public async getBalance(address: string): Promise<BigNumber> {
    const res = await this.api.get(`/account/balance/${this.currencyConfig.name}?address=${address}`);
    Utils.checkAndThrow(res, "Getting balance");
    return new BigNumber(res.data.balance);
  }

  /**
   * Queries the bundler to get it's address for a specific currency
   * @returns the bundler's address
   */
  public async getBundlerAddress(currency: string): Promise<string> {
    const res = await this.api.get("/info");
    Utils.checkAndThrow(res, "Getting Bundler address");
    const address = res.data.addresses[currency];
    if (!address) {
      throw new Error(`Specified bundler does not support currency ${currency}`);
    }
    return address;
  }

  /**
   * Calculates the price for [bytes] bytes paid for with [currency] for the loaded bundlr node.
   * @param currency
   * @param bytes
   * @returns
   */
  public async getPrice(currency: string, bytes: number): Promise<BigNumber> {
    const res = await this.api.get(`/price/${currency}/${bytes}`);
    Utils.checkAndThrow(res, "Getting storage cost");
    return new BigNumber(res.data);
  }

  /**
   * Polls for transaction confirmation (or at least pending status) - used for fast currencies (i.e not arweave)
   * before posting the fund request to the server (so the server doesn't have to poll)
   * @param txid
   * @returns
   */
  public async confirmationPoll(txid: string): Promise<any> {
    if (this.currencyConfig.isSlow) {
      return;
    }
    let lastError;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      if (
        await this.currencyConfig
          .getTx(txid)
          .then((v) => {
            return v?.confirmed;
          })
          .catch((err) => {
            lastError = err;
            return false;
          })
      ) {
        return;
      }
    }
    console.warn(`Tx ${txid} didn't finalize after 30 seconds ${lastError ? ` - ${lastError}` : ""}`);
    return lastError;
  }

  public unitConverter(baseUnits: BigNumber.Value): BigNumber {
    return new BigNumber(baseUnits).dividedBy(this.currencyConfig.base[1]);
  }

  static async verifyReceipt(receipt: UploadReceipt): Promise<boolean> {
    const { id, deadlineHeight, timestamp, public: pubKey, signature, version } = receipt;
    const dh = await deepHash([
      Arweave.utils.stringToBuffer("Bundlr"),
      Arweave.utils.stringToBuffer(version),
      Arweave.utils.stringToBuffer(id),
      Arweave.utils.stringToBuffer(deadlineHeight.toString()),
      Arweave.utils.stringToBuffer(timestamp.toString()),
    ]);
    return await Arweave.crypto.verify(pubKey, dh, base64url.toBuffer(signature));
  }
}
