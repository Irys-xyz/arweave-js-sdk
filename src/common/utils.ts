import type { AxiosResponse } from "axios";
import base64url from "base64url";
import BigNumber from "bignumber.js";
import type Api from "./api";
import type { Arbundles, Token, UploadReceipt, UploadReceiptData } from "./types";
import AsyncRetry from "async-retry";
BigNumber.set({ DECIMAL_PLACES: 50 });

export const sleep = (ms): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
export const httpErrData = (res: AxiosResponse): string => (typeof res.data !== "string" ? res.statusText : res.data);

export class Utils {
  public api: Api;
  public token: string;
  public tokenConfig: Token;
  protected arbundles: Arbundles;
  constructor(api: Api, token: string, tokenConfig: Token) {
    this.api = api;
    this.token = token;
    this.tokenConfig = tokenConfig;
    this.arbundles = this.tokenConfig.irys.arbundles;
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
    const res = await this.api.get(`/account/withdrawals/${this.tokenConfig.name}?address=${this.tokenConfig.address}`);
    Utils.checkAndThrow(res, "Getting withdrawal nonce");
    return res.data;
  }

  /**
   * Gets the balance on the current bundler for the specified user
   * @param address the user's address to query
   * @returns the balance in winston
   */
  public async getBalance(address: string): Promise<BigNumber> {
    const res = await this.api.get(`/account/balance/${this.tokenConfig.name}?address=${address}`);
    Utils.checkAndThrow(res, "Getting balance");
    return new BigNumber(res.data.balance);
  }

  /**
   * Queries the bundler to get it's address for a specific token
   * @returns the bundler's address
   */
  public async getBundlerAddress(token: string): Promise<string> {
    const res = await this.api.get("/info");
    Utils.checkAndThrow(res, "Getting Bundler address");
    const address = res.data.addresses[token];
    if (!address) {
      throw new Error(`Specified bundler does not support token ${token}`);
    }
    return address;
  }

  /**
   * Calculates the price for [bytes] bytes paid for with [token] for the loaded Irys node.
   * @param token
   * @param bytes
   * @returns
   */
  public async getPrice(token: string, bytes: number): Promise<BigNumber> {
    const res = await this.api.get(`/price/${token}/${bytes}`);
    Utils.checkAndThrow(res, "Getting storage cost");
    return new BigNumber(res.data);
  }

  /**
   * This function *estimates* the cost in atomic units for uploading a given set of files
   * note: this function becomes less accurate the smaller your transactions, unless you provide it with an accurate headerSizeAvg
   * @param folderInfo either an array of file sizes in bytes, or an object containing the total number of files and the sum total size of the files in bytes
   * note: for a more precise estimate, you can create an empty (dataless) transaction (make sure you still set tags and other metadata!) and then pass `tx.size` as `headerSizeAvg`
   */
  public async estimateFolderPrice(folderInfo: number[] | { fileCount: number; totalBytes: number; headerSizeAvg?: number }): Promise<BigNumber> {
    if (Array.isArray(folderInfo)) {
      folderInfo = {
        fileCount: folderInfo.length,
        totalBytes: folderInfo.reduce((acc, v) => acc + v, 0),
      };
    }
    // create a 0 data byte tx to estimate the per tx header overhead
    const headerSizeAvg = folderInfo.headerSizeAvg ?? this.arbundles.createData("", this.tokenConfig.getSigner()).getRaw().length;
    const pricePerTxBase = await this.getPrice(this.tokenConfig.name, headerSizeAvg);
    const basePriceForTxs = pricePerTxBase.multipliedBy(folderInfo.fileCount);
    const priceForData = (await this.getPrice(this.tokenConfig.name, folderInfo.totalBytes)).plus(basePriceForTxs).decimalPlaces(0);
    return priceForData;
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
    return new BigNumber(decimalAmount).multipliedBy(this.tokenConfig.base[1]);
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
    return new BigNumber(atomicAmount).dividedBy(this.tokenConfig.base[1]);
  }

  /**
   * Polls for transaction confirmation (or at least pending status) - used for fast currencies (i.e not arweave)
   * before posting the fund request to the server (so the server doesn't have to poll)
   * @param txid
   * @returns
   */
  public async confirmationPoll(txid: string, seconds = 30): Promise<any> {
    if (this.tokenConfig.isSlow) return;
    if (seconds < 0) seconds = 0;
    let lastError;
    let timedout;

    const internalPoll = async (): Promise<boolean> => {
      while (!timedout) {
        const getRes = await this.tokenConfig
          .getTx(txid)
          .then((v) => v?.confirmed)
          .catch((err) => {
            lastError = err;
            return false;
          });
        if (getRes) return true;
        await sleep(1000);
      }
      return false;
    };

    const racer = async (): Promise<"RACE"> => {
      await sleep(seconds * 1_000);
      timedout = true;
      return "RACE";
    };

    const r = await Promise.race([racer(), internalPoll()]);
    if (r === "RACE") {
      console.warn(`Tx ${txid} didn't finalize after ${seconds} seconds ${lastError ? ` - ${lastError}` : ""}`);
      return lastError;
    }
    return r;
  }

  /**
   * @deprecated this method is deprecated in favour of fromAtomic - removal slated for 0.12.0
   */
  public unitConverter(baseUnits: BigNumber.Value): BigNumber {
    return new BigNumber(baseUnits).dividedBy(this.tokenConfig.base[1]);
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
      dependencies.stringToBuffer("Bundlr"),
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

export default Utils;

export const erc20abi = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_from",
        type: "address",
      },
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
      {
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    payable: true,
    stateMutability: "payable",
    type: "fallback",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
];
