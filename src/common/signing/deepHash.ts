import Arweave from "arweave";
import { isBrowser } from "./utils";

export type DeepHashChunk = Uint8Array | AsyncIterable<Buffer> | DeepHashChunks;
export type DeepHashChunks = DeepHashChunk[];

// node crypto createHash : web subtleCrypto digest
let map = {
    "sha256": "SHA-256",
    "sha384": "SHA-384"
};

Object.entries(map).forEach(([k, v]) => { map[v] = k; });

export async function createHashShim(algo: string) {
    if (isBrowser()) {
        algo = (algo.includes("-")) ? algo : algo = map[algo];
        const shimClass = class {
            context = [];
            constructor() { this.context = []; };
            update(data: Buffer) {
                this.context.push(data);
            }
            async digest() { return Buffer.from(await crypto.subtle.digest(algo, Buffer.concat(this.context))); }
        };
        return new shimClass();
    } else {
        return (await import("crypto")).createHash((algo.includes("-")) ? algo = map[algo] : algo);
    }
    // console.log(Object.keys(Crypto));
    // return Crypto.createHash(algo);
}

export async function deepHash(data: DeepHashChunk): Promise<Uint8Array> {
    if (
        typeof data[Symbol.asyncIterator as keyof AsyncIterable<Buffer>] ===
        "function"
    ) {
        const _data = data as AsyncIterable<Buffer>;
        let context = await createHashShim("sha384");



        let length = 0;

        for await (const chunk of _data) {
            length += chunk.byteLength;
            context.update(chunk);
        }

        const tag = Arweave.utils.concatBuffers([
            Arweave.utils.stringToBuffer("blob"),
            Arweave.utils.stringToBuffer(length.toString()),
        ]);

        const taggedHash = Arweave.utils.concatBuffers([
            await Arweave.crypto.hash(tag, "SHA-384"),
            await context.digest(),
        ]);

        return await Arweave.crypto.hash(taggedHash, "SHA-384");
    } else if (Array.isArray(data)) {
        const tag = Arweave.utils.concatBuffers([
            Arweave.utils.stringToBuffer("list"),
            Arweave.utils.stringToBuffer(data.length.toString()),
        ]);

        return await deepHashChunks(
            data,
            await Arweave.crypto.hash(tag, "SHA-384"),
        );
    }

    const _data = data as Uint8Array;

    const tag = Arweave.utils.concatBuffers([
        Arweave.utils.stringToBuffer("blob"),
        Arweave.utils.stringToBuffer(_data.byteLength.toString()),
    ]);

    const taggedHash = Arweave.utils.concatBuffers([
        await Arweave.crypto.hash(tag, "SHA-384"),
        await Arweave.crypto.hash(_data, "SHA-384"),
    ]);

    return await Arweave.crypto.hash(taggedHash, "SHA-384");
}

export async function deepHashChunks(
    chunks: DeepHashChunks,
    acc: Uint8Array,
): Promise<Uint8Array> {
    if (chunks.length < 1) {
        return acc;
    }

    const hashPair = Arweave.utils.concatBuffers([
        acc,
        await deepHash(chunks[0]),
    ]);
    const newAcc = await Arweave.crypto.hash(hashPair, "SHA-384");
    return await deepHashChunks(chunks.slice(1), newAcc);
}

export async function hashStream(
    stream: AsyncIterable<Buffer>,
): Promise<Buffer> {
    const context = await createHashShim("sha384");

    for await (const chunk of stream) {
        context.update(chunk);
    }

    return await context.digest();
}
