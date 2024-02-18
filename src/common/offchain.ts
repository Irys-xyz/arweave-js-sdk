import type Irys from "./irys";
import type { UploadReceipt, UploadReceiptData } from "./types";
import Utils from "./utils";
import type { ChallengeResponse } from "./challenge";
import { generateChallengeResponse, verifyChallenge } from "./challenge";

export class Offchain {
  constructor(protected irys: Irys) {}

  /**
   * Deletes an offchain transaction
   * @param id - the transaction ID of the tx to delete
   * @returns a body containing the txId to the delete provenance record
   */
  async deleteTx(id: string): Promise<OdDeleteResponseBody> {
    const encoded = await this.authOffchainAction(id, { action: OffchainAction.DELETE });
    const res = await this.irys.api.request<OdDeleteResponseBody>(`/od/tx/${id}`, { method: "DELETE", data: encoded });
    console.log(res);
    return res.data;
  }

  /**
   * Upgrades the provided offchain tx to be onchain
   * @param id - the transaction ID of the tx to upgrade
   */
  async upgradeTx(id: string): Promise<UploadReceipt> {
    const encoded = await this.authOffchainAction(id, { action: OffchainAction.UPGRADE });
    const res = await this.irys.api.request(`/od/tx/${id}/upgrade`, { method: "PUT", data: encoded });
    res.data.verify = async (): Promise<boolean> => this.irys.utils.verifyReceipt(res.data as UploadReceiptData);
    return res.data;
  }
  /**
   * Modifies the expiry for an offchain tx to the provided date.
   * note: if you define an expiry for a tx that didn't have one, your account will be charged.
   * @param id - the transaction ID to modify
   * @param expiresBy - the date at which this transaction should expire
   */
  async modifyTxExpiry(id: string, expiresBy: Date | false): Promise<void> {
    const encoded = await this.authOffchainAction(id, {
      action: OffchainAction.MODIFY_EXPIRE,
      expireBy: expiresBy ? expiresBy.getTime() : expiresBy,
    });
    const res = await this.irys.api.request(`/od/tx/${id}/expire`, { method: "PUT", data: encoded });
    await Utils.checkAndThrow(res);
  }

  protected authOffchainAction(
    txId: string,
    opts: { action: OffchainAction.DELETE | OffchainAction.UPGRADE } | { action: OffchainAction.MODIFY_EXPIRE; expireBy: ExpiresBy },
  );
  protected async authOffchainAction(txId: string, opts: { action: OffchainAction; expireBy?: ExpiresBy }): Promise<ChallengeResponse> {
    // get challenge
    const res = await this.irys.api.post(`/challenge/${opts.action}`, { address: this.irys.address, token: this.irys.token, txId }).catch((e) => e);

    console.log(res);
    const challenge = res.data;
    await verifyChallenge({ challenge, irys: this.irys });
    if (opts.action === OffchainAction.MODIFY_EXPIRE) {
      challenge.extra = { expireBy: opts.expireBy!.toString() };
    }
    const response = await generateChallengeResponse({ challenge, irys: this.irys });

    console.log(response);
    return response;
  }
}

export enum OffchainAction {
  DELETE = "OdDelete",
  UPGRADE = "OdUpgrade",
  MODIFY_EXPIRE = "OdModifyExpire",
}
type ExpiresBy = number | false;

type OdDeleteResponseBody = {
  deleteProvenanceRecordId: string;
};
