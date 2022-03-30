import { Signer } from "./Signer";
import Curve25519 from "./keys/curve25519";
import EthereumSigner from "./chains/ethereumSigner";
import { ArweaveSigner, HexInjectedSolanaSigner } from "./chains";

interface IndexToType {
  [key: number]: {
    new(...args): Signer;
    readonly signatureLength: number;
    readonly ownerLength: number;
    verify(
      pk: string | Uint8Array,
      message: Uint8Array,
      signature: Uint8Array,
    ): Promise<boolean>;
  };
}

export const indexToType: IndexToType = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  1: ArweaveSigner,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  2: Curve25519,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  3: EthereumSigner,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  4: HexInjectedSolanaSigner,
};


export enum SignatureConfig {
  ARWEAVE = 1,
  ED25519,
  ETHEREUM,
  SOLANA,
}

interface SignatureMeta {
  sigLength: number;
  pubLength: number;
  sigName: string;
}

export const SIG_CONFIG: Record<SignatureConfig, SignatureMeta> = {
  [SignatureConfig.ARWEAVE]: {
    sigLength: 512,
    pubLength: 512,
    sigName: "arweave",
  },
  [SignatureConfig.ED25519]: {
    sigLength: 64,
    pubLength: 32,
    sigName: "ed25519",
  },
  [SignatureConfig.ETHEREUM]: {
    sigLength: 65,
    pubLength: 65,
    sigName: "ethereum",
  },
  [SignatureConfig.SOLANA]: {
    sigLength: 64,
    pubLength: 32,
    sigName: "solana",
  },
};

