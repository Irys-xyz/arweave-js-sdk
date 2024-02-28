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
    amount: BigNumber.Value;
    expiresInSeconds?: number | string;
  }): Promise<UploadResponse> {
    const tags = [{ name: UploadTags.APPROVE_PAYMENT, value: [approvedAddress, amount, expiresInSeconds].join(",") }];
    return await this.irys.upload("", { tags });
  }

  public async revokeApproval({ approvedAddress }: { approvedAddress: string }): Promise<UploadResponse> {
    const tags = [{ name: UploadTags.DELETE_APPROVAL, value: approvedAddress }];
    return await this.irys.upload("", { tags });
  }
}

type GetApprovedBalanceResponseBody = { amount: string; expiresBy?: string };

export enum UploadTags {
  APPROVE_PAYMENT = "x-irys-approve-payment",
  DELETE_APPROVAL = "x-irys-delete-payment-approval",
}
