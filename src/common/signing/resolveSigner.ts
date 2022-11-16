// resolve signer based off index - resolve to package/global
import { SignerIndex, staticSigner } from "./types";

export async function indexToType(index: number): Promise<staticSigner> {
    // console.log(`resolving signer ID`, index);
    globalThis as any;
    let { pkg, obj } = (globalThis?.Bundlr?.signerIndex as SignerIndex)?.[index];
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