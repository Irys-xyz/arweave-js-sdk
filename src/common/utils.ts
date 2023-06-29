import type { AxiosResponse } from "axios";
import base64url from "base64url";
import BigNumber from "bignumber.js";
import type Api from "./api";
import type { Arbundles, Currency, UploadReceipt, UploadReceiptData } from "./types";
import AsyncRetry from "async-retry";
BigNumber.set({ DECIMAL_PLACES: 50 });

export const sleep = (ms): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default class Utils {
  public api: Api;
  public currency: string;
  public currencyConfig: Currency;
  protected arbundles: Arbundles;
  constructor(api: Api, currency: string, currencyConfig: Currency) {
    this.api = api;
    this.currency = currency;
    this.currencyConfig = currencyConfig;
    this.arbundles = this.currencyConfig.irys.arbundles;
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
   * Calculates the price for [bytes] bytes paid for with [currency] for the loaded Irys node.
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
   * Returns the decimal values' equivalent in atomic units
   * @example
   * 0.1 ETH -> 100,000,000,000,000,000 wei
   * ```
   * toAtomic(100_000_000_000_000_000) -> 0.1
   * ```
   * @param decimalAmount - amount in decimal
   * @returns amount in atomic units
   */
  public toAtomic(decimalAmount: BigNumber.Value): BigNumber {
    return new BigNumber(decimalAmount).multipliedBy(this.currencyConfig.base[1]);
  }

  /**
   * Returns the atomic amounts' equivalent in decimal units
   * @example
   * 100,000,000,000,000,000 wei -> 0.1 ETH
   * ```
   * fromAtomic(0.1) -> 100_000_000_000_000_000
   * ```
   * @param atomicAmount
   * @returns
   */
  public fromAtomic(atomicAmount: BigNumber.Value): BigNumber {
    return new BigNumber(atomicAmount).dividedBy(this.currencyConfig.base[1]);
  }

  /**
   * Polls for transaction confirmation (or at least pending status) - used for fast currencies (i.e not arweave)
   * before posting the fund request to the server (so the server doesn't have to poll)
   * @param txid
   * @returns
   */
  public async confirmationPoll(txid: string, seconds = 30): Promise<any> {
    if (this.currencyConfig.isSlow) {
      return;
    }
    if (seconds < 0) seconds = 0;
    let lastError;
    for (let i = 0; i < seconds; i++) {
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

  /**
   * @deprecated this method is deprecated in favour of fromAtomic - removal slated for 0.12.0
   */
  public unitConverter(baseUnits: BigNumber.Value): BigNumber {
    return new BigNumber(baseUnits).dividedBy(this.currencyConfig.base[1]);
  }

  async verifyReceipt(receipt: UploadReceiptData): Promise<boolean> {
    return Utils.verifyReceipt(this.arbundles, receipt);
  }

  static async verifyReceipt(
    dependencies: Pick<Arbundles, "stringToBuffer" | "getCryptoDriver" | "deepHash">,
    receipt: UploadReceiptData,
  ): Promise<boolean> {
    const { id, deadlineHeight, timestamp, public: pubKey, signature, version } = receipt;
    const dh = await dependencies.deepHash([
      dependencies.stringToBuffer("bundlr"),
      dependencies.stringToBuffer(version),
      dependencies.stringToBuffer(id),
      dependencies.stringToBuffer(deadlineHeight.toString()),
      dependencies.stringToBuffer(timestamp.toString()),
    ]);
    return await dependencies.getCryptoDriver().verify(pubKey, dh, base64url.toBuffer(signature));
  }

  public async getReceipt(txId: string): Promise<UploadReceipt> {
    // get receipt information from GQL
    const query = `query {
      transactions(ids: ["${txId}"]) {
        edges {
          node {
            receipt {
              signature
              timestamp
              version
              deadlineHeight
            }
          }
        }
      }
    }`;

    const queryRes = await AsyncRetry(async () => {
      return await this.api.post(
        "/graphql",
        { query },
        {
          headers: { "content-type": "application/json" },
          validateStatus: (s) => s === 200,
        },
      );
    });

    const receiptData: { version: string; timestamp: number; signature: string; deadlineHeight: number } =
      queryRes?.data?.data?.transactions?.edges?.at(0)?.node?.receipt;
    if (!receiptData) throw new Error(`Missing required receipt data from node for tx: ${txId}`);
    // get public key from node
    const pubKey = (await this.api.get("/public")).data;
    const receipt = {
      public: pubKey,
      version: receiptData.version as "1.0.0",
      id: txId,
      timestamp: receiptData.timestamp,
      validatorSignatures: [],
      signature: receiptData.signature,
      deadlineHeight: receiptData.deadlineHeight,
      // use stub to conform to type
      verify: async (): Promise<boolean> => {
        return false;
      },
    };
    // inject method
    receipt.verify = async (): Promise<boolean> => this.verifyReceipt(receipt);
    return receipt;
  }
}
