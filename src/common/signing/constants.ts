
// import Curve25519 from "./keys/curve25519";
// import EthereumSigner from "./chains/ethereumSigner";
// import { ArweaveSigner, HexInjectedSolanaSigner } from "./chains";
import { IndexToType } from "./types"


// export const indexToType: IndexToType = {
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   1: ArweaveSigner,
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   2: Curve25519,
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   3: EthereumSigner,
//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   // @ts-ignore
//   4: HexInjectedSolanaSigner,
// };

// this is dynamically mutated by loaded signers on initialisation time
export const indexToType: IndexToType = {


}


// export async function dynamicIndexToType(index: number): Promise<IndexToType> {
//   if (!this.index) {
//     this.index = new Map()
//   }
//   if (this.index.has(index)) {
//     return this.index.get(index)
//   } else {
//     const dep = await this.getOptionalDep()
//     this.index.set(index, dep)
//     return dep;
//   }
// }


// export const indexToPackage: IndexToPackage = {
//   1: "@bundlr-network/arweave-node"
// }

// export async function getOptionalDep(name: string): Promise<any> {
//   let dep;
//   try {
//     // cjs
//     dep = require(name)
//     // eslint-disable-next-line no-empty
//   } catch (e) { }
//   // esm
//   dep = (await import(name).catch(_ => { return { default: undefined } })).default
//   if (!dep) {
//     throw new Error(`Optional Dependency ${name} not found!`)
//   }
//   return dep;
// }

// export class Index {
//   private static instance: Index = new Index()
//   public static index = new Map()
//   constructor() {
//     if (Index.instance) {
//       return Index.instance
//     }
//   }
//   public static addIndex(index: number, signer: IndexToType): void {
//     Index.index.set(index, signer)
//   }
//   public static getIndex(index: number): IndexToType {
//     return Index.index.get(index);
//   }

// }

// export const test = Index.index


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

