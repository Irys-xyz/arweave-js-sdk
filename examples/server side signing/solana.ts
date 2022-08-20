import Bundlr from "@bundlr-network/client/";
import WebBundlr from "@bundlr-network/client/build/web";

// server side
let serverBundlr;

export async function serverInit(): Promise<Buffer> {
    const key = "..."; // your private key
    serverBundlr = new Bundlr("https://devnet.bundlr.network", "solana", key);
    const publicKey = serverBundlr.currencyConfig.getSigner().publicKey;
    return publicKey; // transfer public key to client
}

export async function signDataOnServer(signatureData: Buffer): Promise<Buffer> {
    return await serverBundlr.currencyConfig.sign(signatureData);
}

// client side
async function clientSide() {

    // public key is stored/provided to the client
    const pubkey = await serverInit();
    // mock provider
    const provider = {
        publicKey: {
            toBuffer: () => pubkey,
            byteLength: 32
        },
        signMessage: (message) => {
            return "serverSignature";
        },

    };
    const bundlr = new WebBundlr("https://devnet.bundlr.network", "solana", provider);
    //tags
    const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }];
    // example data (manifest)
    const manifest = { "manifest": "arweave/paths", "version": "0.1.0", "paths": { "basten.jpg": { "id": "cu2RWNO8T6t2zZ6f9FTIY5S_GY5A19jWfGp-fKBEAxk" } } };
    const transaction = bundlr.createTransaction(JSON.stringify(manifest), { tags });
    // get signature data
    const signatureData = Buffer.from(await transaction.getSignatureData());

    // get signed signature
    const signed = await signDataOnServer(signatureData);

    // write signed signature to transaction
    transaction.setSignature(signed);

    // check the tx is signed and valid
    console.log({ isSigned: transaction.isSigned(), isValid: await transaction.isValid() });
    // upload as normal
    const res = await transaction.upload();
    console.log(res);
}
clientSide();