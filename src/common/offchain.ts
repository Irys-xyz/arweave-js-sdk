import base64url from "base64url";
import type Irys from "./irys";
import type { Base64URLString, Common, UploadReceipt, UploadReceiptData } from "./types";
import type { Override } from "./utilityTypes";
import Utils from "./utils";

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
    const encoded = await this.authOffchainAction(id, { action: OffchainAction.MODIFY_EXPIRE, expireBy: expiresBy });
    const res = await this.irys.api.request(`/od/tx/${id}/expire`, { method: "PUT", data: encoded });
    await Utils.checkAndThrow(res);
    // return res;
  }

  protected async getOffchainExpireChangeNonce(): Promise<OdTxExpireChangeNonceResponseBody> {
    const address = this.irys.address!;
    const token = this.irys.token;
    const body: OdTxExpireChangeNonceRequestBody = { address, token };
    const res = await this.irys.api.post<OdTxExpireChangeNonceResponseBody>("/account/nonce/od/change-expire", body);
    await Utils.checkAndThrow(res);
    return res.data;
  }

  protected authOffchainAction(
    txId: string,
    opts: { action: OffchainAction.DELETE | OffchainAction.UPGRADE } | { action: OffchainAction.MODIFY_EXPIRE; expireBy: ExpiresBy },
  );
  protected async authOffchainAction(txId: string, opts: { action: OffchainAction; expireBy?: ExpiresBy }): Promise<OdActionRequestBodyEncoded> {
    const tokenConfig = this.irys.tokenConfig;
    const signer = tokenConfig.getSigner();
    const publicKey = await tokenConfig.getPublicKey();
    const { deepHash, stringToBuffer } = this.irys.arbundles;

    let data: OdActionRequestBodiesCommon = {
      publicKey: !Buffer.isBuffer(publicKey) ? Buffer.from(publicKey) : publicKey,
      token: this.irys.token,
      txId,
      sigType: signer.signatureType,
      version: OffchainActionPayloadVersion.V1,
    };
    const hashElements = [stringToBuffer(txId), stringToBuffer(opts.action)];
    if (!Buffer.isBuffer(publicKey)) {
      data.publicKey = Buffer.from(publicKey);
    }

    // TODO: make this infer nicer somehow?
    if (opts.action === OffchainAction.MODIFY_EXPIRE) {
      const body: OdExpireChangeActionRequestBody = {
        ...data,
        action: OffchainAction.MODIFY_EXPIRE,
        nonce: (await this.getOffchainExpireChangeNonce()).nonce,
        expireBy: opts.expireBy === false ? "false" : opts.expireBy!.getTime().toString(),
      };
      hashElements.push(stringToBuffer(body.nonce));
      hashElements.push(stringToBuffer(body.expireBy.toString()));
      data = body;
    }

    const hash = await deepHash(hashElements);
    const signature = await signer.sign(hash);

    const encoded: OdActionRequestBodyEncoded = {
      ...data,
      action: opts.action,
      publicKey: base64url.encode(data.publicKey),
      signature: base64url.encode(Buffer.from(signature)),
    };

    const h2 = await deepHash(hashElements);
    console.log(hashElements);
    const bpub = base64url.toBuffer(encoded.publicKey);
    const bsig = base64url.toBuffer(encoded.signature);
    const isValid = await tokenConfig.verify(bpub, h2, bsig);

    const address = tokenConfig.ownerToAddress(
      tokenConfig.name === "arweave" ? base64url.decode(encoded.publicKey) : base64url.toBuffer(encoded.publicKey),
    );

    if (address !== this.irys.address) console.warn(`[offchain:auth] derived address does not equal Irys instance address`);
    if (!isValid) console.warn(`[offchain:auth] signature verification failed`);

    return encoded;
  }
}

enum OffchainAction {
  DELETE = "delete",
  UPGRADE = "upgrade",
  MODIFY_EXPIRE = "modifyExpire",
}

type ExpiresBy = Date | false;

enum OffchainActionPayloadVersion {
  V1 = "1.0.0",
}
export const OFFCHAIN_ACTION_VERSION = "1.0.0" as const;

type OdDeleteResponseBody = {
  deleteProvenanceRecordId: string;
};

export type OdActionRequestBodyBase = {
  txId: string;
  token: string;
  publicKey: Buffer;
  sigType: number;
  action: OffchainAction;
  version: OffchainActionPayloadVersion;
};
export type OdActionRequestBody = {
  action: OffchainAction.DELETE | OffchainAction.UPGRADE;
} & OdActionRequestBodyBase;

export type OdExpireChangeActionRequestBody = {
  action: OffchainAction.MODIFY_EXPIRE;
  nonce: string;
  expireBy: string;
} & OdActionRequestBodyBase;

export type OdActionRequestBodies = OdExpireChangeActionRequestBody | OdActionRequestBody;
export type OdActionRequestBodiesCommon = Common<OdExpireChangeActionRequestBody, OdActionRequestBody>;

export type OdActionRequestBodyEncoded = Override<OdActionRequestBodies, { publicKey: Base64URLString; signature: Base64URLString }>;

type OdTxExpireChangeNonceRequestBody = {
  address: string;
  token: string;
};

type OdTxExpireChangeNonceResponseBody = {
  nonce: string;
};
