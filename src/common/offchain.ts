import base64url from "base64url";
import type Irys from "./irys";
import type { Base64URLString, UploadReceipt, UploadReceiptData } from "./types";
import type { Override } from "./utilityTypes";

export class Offchain {
  constructor(protected irys: Irys) {}

  /**
   * Deletes an offchain transaction
   * @param id - the transaction ID of the tx to delete
   * @returns a body containing the txId to the delete provenance record
   */
  async deleteTx(id: string): Promise<OdDeleteResponseBody> {
    const encoded = await this.authOffchainAction(id, OffchainAction.DELETE);
    const res = await this.irys.api.request<OdDeleteResponseBody>(`/od/tx/${id}`, { method: "DELETE", data: encoded });
    console.log(res);
    return res.data;
  }

  /**
   * Upgrades the provided offchain tx to be onchain
   * @param id - the transaction ID of the tx to upgrade
   */
  async upgradeTx(id: string): Promise<UploadReceipt> {
    const encoded = await this.authOffchainAction(id, OffchainAction.UPGRADE);
    const res = await this.irys.api.request(`/od/tx/${id}`, { method: "PUT", data: encoded });
    res.data.verify = async (): Promise<boolean> => this.irys.utils.verifyReceipt(res.data as UploadReceiptData);
    return res.data;
  }

  protected async authOffchainAction(txId: string, action: OffchainAction): Promise<OdActionRequestBodyEncoded> {
    const tokenConfig = this.irys.tokenConfig;
    const signer = tokenConfig.getSigner();
    const publicKey = await tokenConfig.getPublicKey();

    const data: OdActionRequestBody = {
      publicKey: !Buffer.isBuffer(publicKey) ? Buffer.from(publicKey) : publicKey,
      token: this.irys.token,
      txId,
      sigType: signer.signatureType,
      action,
      version: OffchainActionPayloadVersion.V1,
    };
    if (!Buffer.isBuffer(publicKey)) {
      data.publicKey = Buffer.from(publicKey);
    }

    const { deepHash, stringToBuffer } = this.irys.arbundles;
    const hash = await deepHash([stringToBuffer(txId), stringToBuffer(action)]);
    const signature = await signer.sign(hash);

    const encoded: OdActionRequestBodyEncoded = {
      ...data,
      publicKey: base64url.encode(data.publicKey),
      signature: base64url.encode(Buffer.from(signature)),
    };

    const h2 = await deepHash([stringToBuffer(encoded.txId), stringToBuffer(encoded.action)]);
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
}

enum OffchainActionPayloadVersion {
  V1 = "1.0.0",
}
export const OFFCHAIN_ACTION_VERSION = "1.0.0" as const;

type OdDeleteResponseBody = {
  deleteProvenanceRecordId: string;
};

// we don't need a nonce as OD actions are a one-time operation on a unique resource
export type OdActionRequestBody = {
  txId: string;
  token: string;
  publicKey: Buffer;
  sigType: number;
  action: OffchainAction;
  version: OffchainActionPayloadVersion;
};

export type OdActionRequestBodyEncoded = Override<OdActionRequestBody, { publicKey: Base64URLString; signature: Base64URLString }>;
