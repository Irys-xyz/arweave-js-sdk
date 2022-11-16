import { sign } from "@noble/ed25519";
import { decode } from "bs58";

const key = decode("privateKey");
const priv = key.subarray(0, 32);
const pub = key.subarray(32, 64);

const provider = {
    publicKey: {
        toBuffer: () => pub,
        byteLength: 32
    },
    signMessage: async (message) => {
        return await sign(Buffer.from(Buffer.from(message).toString("hex")), Buffer.from(priv));
    },

};

const bundlr = new Bundlr(url, "solana", provider)


