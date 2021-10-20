import { ArweaveSigner } from "arbundles";
import { createData } from "arbundles/file/createData"
import { readFileSync, statSync } from "fs";
import mime from "mime-types";
import { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";

export default class Uploader {
    private readonly api: ApiConfig;
    private config: { wallet: JWKInterface };

    constructor(api: ApiConfig, config: { wallet: JWKInterface }) {
        this.api = api;
        this.config = config;
    }

    public async upload(path) {
        try {
            if (!statSync(path)) {
                throw new Error(`Unable to access path: ${path}`);
            }
            const signer = new ArweaveSigner(this.config.wallet);
            const mimeType = mime.lookup(path);
            const tags = [{ name: "Content-Type", value: mimeType }]
            const dataItem = await createData(readFileSync(path), signer, { tags });
            await dataItem.sign(signer);
            const { protocol, host, port } = this.api;
            return await dataItem.sendToBundler(`${protocol}://${host}:${port}`);

        } catch (err) {
            throw new Error(`Error whilst sending: ${err}`);
        }
    }
}

