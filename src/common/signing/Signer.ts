import Arweave from "arweave";
import { getSignatureData } from "./base";
import { DataItem } from "./DataItem";

export abstract class Signer {
  readonly publicKey!: Buffer;
  readonly signatureType!: number;
  readonly signatureLength!: number;
  readonly ownerLength!: number;
  readonly pem?: string | Buffer;

  abstract sign(message: Uint8Array): Promise<Uint8Array> | Uint8Array;
  static verify(_: string | Buffer): boolean | Promise<boolean> {
    throw new Error("You must implement verify method on child");
  };
}


/**
 * Signs a single
 *
 * @param item
 * @param signer
 * @returns signings - signature and id in byte-arrays
 */
export async function getSignatureAndId(
  item: DataItem,
  signer: Signer,
): Promise<{ signature: Buffer; id: Buffer; }> {
  //@ts-ignore
  const signatureData = await getSignatureData(item);

  const signatureBytes = await signer.sign(signatureData);
  const idBytes = await Arweave.crypto.hash(signatureBytes);

  return { signature: Buffer.from(signatureBytes), id: Buffer.from(idBytes) };
}

/**
 * Signs and returns item id
 *
 * @param item
 * @param jwk
 */
export async function sign(item: DataItem, signer: Signer): Promise<Buffer> {
  const { signature, id } = await getSignatureAndId(item, signer);
  item.getRaw().set(signature, 2);
  return id;
}