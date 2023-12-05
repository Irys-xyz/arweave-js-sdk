import base64url from "base64url";
import type Irys from "./irys";
import type { OdDeleteBody, OdDeleteBodyEncoded } from "./types";
import type { FIXME } from "./utilityTypes";

export class Offchain {
  constructor(public irys: Irys) {}

  async deleteTx(id: string): Promise<FIXME> {
    // create payload
    const tokenConfig = this.irys.tokenConfig;
    const signer = tokenConfig.getSigner();
    const publicKey = await tokenConfig.getPublicKey();

    const data: OdDeleteBody = {
      publicKey: !Buffer.isBuffer(publicKey) ? Buffer.from(publicKey) : publicKey,
      token: this.irys.token,
      txId: id,
      sigType: signer.signatureType,
    };
    if (!Buffer.isBuffer(publicKey)) {
      data.publicKey = Buffer.from(publicKey);
    }

    const { deepHash, stringToBuffer } = this.irys.arbundles;
    const hash = await deepHash([stringToBuffer(id)]);
    const signature = await signer.sign(hash);

    const encoded: OdDeleteBodyEncoded = {
      ...data,
      publicKey: base64url.encode(data.publicKey),
      signature: base64url.encode(Buffer.from(signature)),
    };

    const h2 = await deepHash([stringToBuffer(encoded.txId)]);
    const isValid = await tokenConfig.verify(base64url.toBuffer(encoded.publicKey), h2, base64url.toBuffer(encoded.signature));

    const address = tokenConfig.ownerToAddress(
      tokenConfig.name === "arweave" ? base64url.decode(encoded.publicKey) : base64url.toBuffer(encoded.publicKey),
    );

    console.log(isValid, address);
    const res = await this.irys.api.request(`/oc/tx/${id}`, { method: "DELETE", data: encoded });
    console.log(res);
  }
}
