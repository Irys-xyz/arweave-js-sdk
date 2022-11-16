import Arweave from "arweave";
import { getSignatureData } from "./base";
import { DataItem } from "./DataItem";
import { SignerIndex } from "./types";


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


// global obj

export const signerIndex: SignerIndex = {
  1: { pkg: ["@bundlr-network/arweave/signer"], obj: undefined }, //Arweave
  2: { //Curve25519
    pkg: [
      "@bundlr-network/solana/curve25519",
      "@bundlr-network/algorand/curve25519",
      "@bundlr-network/aptos/curve25519"
    ], obj: undefined
  },
  3: { //Ethereum
    pkg: [
      "@bundlr-network/ethereum/signer",
      "@bundlr-network/ethereum-web/signer"
    ], obj: undefined
  },
  4: { //Hex encoded Solana
    pkg: [
      "@bundlr-network/solana/hexSigner",
      "@bundlr-network/solana-web/hexSigner"
    ], obj: undefined
  },
  5: { //Aptos
    pkg: [
      "@bundlr-network/aptos-web/signer",
      "@bundlr-network/aptos/signer"
    ], obj: undefined
  },
  6: { //multiSig aptos
    pkg: [
      "@bundlr-network/aptos-web/signer",
      "@bundlr-network/aptos/signer"
    ], obj: undefined
  },
};


(globalThis.Bundlr ??= {}).signerIndex ??= signerIndex;