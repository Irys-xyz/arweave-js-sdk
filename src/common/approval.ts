import type BigNumber from "bignumber.js";
import type Irys from "./irys";
import type { UploadResponse } from "./types";
import Utils from "./utils";

export class Approval {
  constructor(protected irys: Irys) {}

  public async getApprovedBalance({
    payingAddress = this.irys.address!,
    token = this.irys.token,
    approvedAddress,
  }: {
    payingAddress?: string;
    token?: string;
    approvedAddress: string;
  }): Promise<GetApprovedBalanceResponseBody> {
    const res = await this.irys.api.get<GetApprovedBalanceResponseBody>("/account/approval", { params: { payingAddress, token, approvedAddress } });
    if (res.status === 404) return { amount: "0" };
    Utils.checkAndThrow(res);
    return res.data;
  }

  public async createApproval({
    approvedAddress,
    amount,
    expiresInSeconds,
  }: {
    approvedAddress: string;
    amount: string | number | BigNumber;
    expiresInSeconds?: number | string;
  }): Promise<UploadResponse> {
    const tags = [
      { name: UploadApprovalTags.APPROVE_PAYMENT, value: approvedAddress },
      { name: UploadApprovalMetaTags.AMOUNT, value: amount.toString() },
    ];
    if (expiresInSeconds) tags.push({ name: UploadApprovalMetaTags.EXPIRE_SECONDS, value: expiresInSeconds.toString() });
    return await this.irys.upload("", { tags });
  }

  public async revokeApproval({ approvedAddress }: { approvedAddress: string }): Promise<UploadResponse> {
    const tags = [{ name: UploadApprovalTags.DELETE_APPROVAL, value: approvedAddress }];
    return await this.irys.upload("", { tags });
  }
}

type GetApprovedBalanceResponseBody = { amount: string; expiresBy?: string };

export enum UploadApprovalTags {
  APPROVE_PAYMENT = "x-irys-approve-payment",
  DELETE_APPROVAL = "x-irys-delete-payment-approval",
}

export enum UploadApprovalMetaTags {
  AMOUNT = "x-amount",
  EXPIRE_SECONDS = "x-expire-seconds",
}