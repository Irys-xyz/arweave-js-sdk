import { WitnessClient } from "@witnessco/client";
import type Irys from "./irys";
import type { Base64URLString, Override } from "./types";
import base64url from "base64url";

export class Checkpointing {
  constructor(protected irys: Irys) {}

  protected getWitnessClient(): WitnessClient {
    return new WitnessClient();
  }
  public async getProofForTx(txId: string): Promise<
    | "pending"
    | {
        validTree: boolean;
        validWitness: undefined | "pending" | boolean;
      }
  > {
    // get proof
    const res = await this.irys.api.get<GetTxProofReturnBody>(`/checkpoint/proof/${txId}`);
    const data = res.data;
    if (data === "pending") return "pending";
    // verify inclusion proof
    const proofBuf = base64url.toBuffer(data.proof);
    const isProofValid = await validateProof(base64url.toBuffer(data.rootId), BigInt(data.offset), proofBuf, {
      hash: this.irys.arbundles.getCryptoDriver().hash,
    });
    if (!isProofValid) {
      return { validTree: false, validWitness: undefined };
    }
    // verify witness proof
    if (data.witness === "pending") return { validTree: true, validWitness: "pending" };
    const witnessClient = this.getWitnessClient();
    const witnessValid = await witnessClient.verifyProofServer({ ...data.witness, leafIndex: BigInt(data.witness.leafIndex) });
    if (witnessValid.success) return { validTree: true, validWitness: true };
    return { validTree: true, validWitness: false };
  }
}

type GetTxProofReturnBody =
  | "pending"
  | {
      txId: string;
      rootId: string;
      leafHash: string;
      timestamp: string;
      offset: string;
      proof: Base64URLString;
      confirmed: boolean;
      witness:
        | ({
            valid: { success: boolean };
          } & Override<Awaited<ReturnType<WitnessClient["getProofForLeafHash"]>>, { leafIndex: string }>)
        | "pending";
    };

export async function validateProof(
  id: Uint8Array,
  dest: bigint,
  path: Buffer,
  opts: { hash: (data: Uint8Array | Uint8Array[]) => Promise<Uint8Array> | Uint8Array },
): Promise<boolean> {
  const version = path.subarray(0, 1)[0];
  if (version !== 1) throw new Error("Unknown proof path version");
  const ctx = {
    timestampSize: path.subarray(1, 2)[0],
    txIdSize: path.subarray(2, 3)[0],
    hashSize: path.subarray(3, 4)[0],
    hash: opts.hash,
  };
  return validateProofWalk(id, dest, path.subarray(4), ctx);
}

export function bufferToBigInt(buffer: Buffer): bigint {
  const hex = buffer.toString("hex");
  if (!hex) return 0n;
  return BigInt(`0x${hex}`);
}

export const arrayCompare = (a: Uint8Array | any[], b: Uint8Array | any[]): boolean => a.every((value: any, index: any) => b[index] === value);

export type TreeCtx = {
  timestampSize: number;
  relativeTimestampSize: number;
  txIdSize: number;
  baseTimestamp: bigint;
  noteSize: number;
  hashSize: number;
};

export async function validateProofWalk(
  id: Uint8Array,
  dest: bigint,
  path: Buffer,
  ctx: Pick<TreeCtx, "timestampSize" | "txIdSize" | "hashSize"> & { hash: (data: Uint8Array | Uint8Array[]) => Promise<Uint8Array> | Uint8Array },
): Promise<boolean> {
  const noteSize = ctx.timestampSize + ctx.txIdSize;

  // if we're at a leaf
  if (path.length == ctx.hashSize + noteSize) {
    const pathData = path.subarray(0, ctx.hashSize);
    const endOffsetBuffer = path.subarray(pathData.length, pathData.length + noteSize);
    // validate the offsets line up
    const endOffset = bufferToBigInt(endOffsetBuffer);
    if (endOffset != dest) return false;
    // re-create leaf ID here
    const pathDataHash = await ctx.hash([await ctx.hash(pathData), await ctx.hash(endOffsetBuffer)]);

    return arrayCompare(id, pathDataHash);
  }

  // branch case
  const left = path.subarray(0, ctx.hashSize); // left.id
  const right = path.subarray(left.length, left.length + ctx.hashSize); // right.id
  const offsetBuffer = path.subarray(left.length + right.length, left.length + right.length + noteSize);

  // should be left.maxOffset
  const offset = bufferToBigInt(offsetBuffer);

  const remainder = path.subarray(left.length + right.length + offsetBuffer.length);

  const pathHash = await ctx.hash([await ctx.hash(left), await ctx.hash(right), await ctx.hash(offsetBuffer)]);

  if (arrayCompare(id, pathHash)) {
    // slide to the left~
    if (dest <= offset) {
      return await validateProofWalk(left, dest, remainder, ctx);
    }
    // slide to the right~
    return await validateProofWalk(right, dest, remainder, ctx);
  }
  // criss cro... return false
  return false;
}
