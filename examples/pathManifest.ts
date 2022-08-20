import { readFileSync } from "fs";
import Bundlr from "../build";


export async function pathManifest(paths = ["1.json", "2.json", "3.json"], wallet = "./wallet.json") {
    const jwk = JSON.parse(readFileSync(wallet, "utf-8"));

    const bundlr = new Bundlr("https://devnet.bundlr.network", "arweave", jwk);
    // upload items, creating the mapping of paths to item IDs

    // upload items and create mapping
    const mapping = new Map(await Promise.all(paths.map(p => {
        return bundlr.uploadFile(p).then(r => [p, r.data.id])
            .catch(e => console.log(`Error uploading ${p} - ${e}`)) as Promise<[string, string]>;
    })));

    // create manifest tx
    const manifest = await bundlr.uploader.generateManifest({ items: mapping });
    const manifestTx = bundlr.createTransaction(JSON.stringify(manifest), { tags: [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }] });
    await manifestTx.sign();
    const uploadRes = await manifestTx.upload();
    const id = uploadRes.data.id;
    // data is now accessible at https://arweave.net/<id>/1.json, ../2.json, etc.
    return id;
}
