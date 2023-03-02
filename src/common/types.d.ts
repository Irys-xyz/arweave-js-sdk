import type BigNumber from "bignumber.js";
import type { Signer } from "arbundles/src/signing";
import type { FileDataItem } from "arbundles/file";
import type { DataItemCreateOptions } from "arbundles";
// common types shared between web and node versions

export interface CreateTxData {
  amount: BigNumber.Value;
  to: string;
  fee?: string;
}

export interface Tx {
  from: string;
  to: string;
  amount: BigNumber;
  blockHeight?: BigNumber;
  pending: boolean;
  confirmed: boolean;
}
export interface CurrencyConfig {
  name: string;
  ticker: string;
  minConfirm?: number;
  wallet?: string | object;
  providerUrl: string;
  isSlow?: boolean;
  opts?: any;
}

export interface Currency {
  isSlow: boolean;
  needsFee: boolean;

  base: [string, number];

  name: string;

  get address(): string | undefined;

  ticker: string;

  getTx(txId: string): Promise<Tx>;

  ownerToAddress(owner: any): string;

  getId(item: FileDataItem): Promise<string>;

  price(): Promise<number>;

  sign(data: Uint8Array): Promise<Uint8Array>;

  getSigner(): Signer;

  verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

  getCurrentHeight(): Promise<BigNumber>;

  getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber | object>;

  sendTx(data: any): Promise<string | undefined>;

  createTx(amount: BigNumber.Value, to: string, fee?: string | object): Promise<{ txId: string | undefined; tx: any }>;

  getPublicKey(): Promise<string | Buffer> | (string | Buffer);

  ready?(): Promise<void>;

  // createMultiSigTx?(amount: BigNumber.Value, to: string, opts: any, fee?: string): Promise<any>;

  // addSignature?(multiTx: any, opts: any): Promise<any>;

  // submitMultiSigTx?(multiTx: any, opts: any): Promise<any>;
}

export interface Manifest {
  manifest: string;
  version: string;
  paths: Record<string, Record<string, Record<"id", string>>>;
  index?: Record<"path", string>;
}

export interface UploadResponse {
  // The ID of the transaction
  id: string;

  /**
   * All below (bar timestamp) are optional (requiring the getReceiptSignature option)
   */

  // The Arweave public key of the node that received the transaction
  public?: string;
  // The signature of this receipt
  signature?: string;
  // the maximum expected Arweave block height for transaction inclusion
  deadlineHeight?: number;
  // List of validator signatures
  validatorSignatures?: { address: string; signature: string }[];
  // The UNIX (MS precision) timestamp of when the node received the Tx. Only optional if the upload receives a `201` error in response to a duplicate transaction upload.
  timestamp?: number;
  // The receipt version
  version?: "1.0.0";
  // Injected verification function (same as Utils/Bundlr.verifyReceipt) - only present if getReceiptSignature is set.
  verify?: () => Promise<boolean>;
}

export type UploadReceipt = Required<UploadResponse>;
export type UploadReceiptData = Omit<UploadReceipt, "verify">;

export interface FundResponse {
  reward: string;
  target: string;
  quantity: string;
  id: string;
}
export interface WithdrawalResponse {
  tx_id: string;
  requested: number;
  fee: number;
  final: number;
}

export type CreateAndUploadOptions = DataItemCreateOptions & { upload?: UploadOptions };
export interface UploadOptions {
  // If you want to receive the cryptographic receipt for your upload - if the upload is a duplicate (i.e A transaction with the same signature has already been uploaded), setting this to true will cause it to throw.
  getReceiptSignature?: boolean;
}
// // TS doesn't like string template literals it seems
// export enum manifestType {
//     paths = "arweave/paths"
// }

// export enum manifestVersion {
//     "0.1.0" = "0.1.0"
// }

export type BundlrTransactionCreateOptions = DataItemCreateOptions & { dataIsRawTransaction?: boolean };
