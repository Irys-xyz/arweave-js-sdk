// resolve signer based off index - resolve to package/global
import { staticSigner } from "./types";


// global obj

const signerIndex: { [k: number]: { pkg: string[], obj: staticSigner; }; } = {
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




export async function indexToType(index: number): Promise<staticSigner> {
    globalThis as any;
    let { pkg, obj } = (globalThis?.Bundlr?.signerIndex as typeof signerIndex)?.[index];
    try {
        if (obj) return obj;
        for (const p of pkg) {
            try {
                obj = await import(p);
                obj = require(p);
            } catch (e) { }
        }
        return obj;
    } catch (e) {
        throw new Error(`Failed to load signer with index ${index}. packages that contain this signer are: ${pkg}`);
    }

}