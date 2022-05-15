export abstract class Signer {
  readonly publicKey!: Buffer;
  readonly signatureType!: number;
  readonly signatureLength!: number;
  readonly ownerLength!: number;
  readonly pem?: string | Buffer;

  abstract sign(message: Uint8Array): Promise<Uint8Array> | Uint8Array;
  abstract verify(_: string | Buffer): boolean | Promise<boolean>;
}
