import { ArweaveSigner, createData } from "arbundles";
import * as fs from "fs";
import mime from "mime-types";
import { ApiConfig } from "arweave/node/lib/api";
import { JWKInterface } from "arweave/node/lib/wallet";
import { AxiosResponse } from "axios";

export default class Uploader {
    private readonly api: ApiConfig
    private wallet: JWKInterface;

    constructor(api: ApiConfig, wallet: JWKInterface) {
        this.api = api;
        this.wallet = wallet;
    }

    /**
     * Uploads a file to the bundler
     * @param path to the file to be uploaded
     * @returns the response from the bundler
     */
    public async uploadFile(path: string): Promise<AxiosResponse<any>> {
        try {
            if (!fs.promises.stat(path).then(_ => true).catch(_ => false)) {
                throw new Error(`Unable to access path: ${path}`);
            }
            const signer = new ArweaveSigner(this.wallet);
            const mimeType = mime.lookup(path);
            const tags = [{ name: "Content-Type", value: mimeType }]
            const dataItem = await createData(path, signer, { tags });
            await dataItem.sign(signer);
            const { protocol, host, port } = this.api;
            return await dataItem.sendToBundler(`${protocol}://${host}:${port}`);

        } catch (err) {
            throw new Error(`Error whilst sending: ${err.message}`);
        }
    }

    /**
     * Uploads data to the bundler
     * @param data
     * @param tags
     * @returns the response from the bundler
     */
    public async upload(data: Buffer, tags: { name: string, value: string }[]): Promise<AxiosResponse<any>> {
        try {
            const signer = new ArweaveSigner(this.wallet);
            const dataItem = createData(
                data,
                signer,
                { tags }
            );
            await dataItem.sign(signer);
            const { protocol, host, port } = this.api;
            return await dataItem.sendToBundler(`${protocol}://${host}:${port}`);
        } catch (err) {
            throw new Error(`Error whilst sending: ${err.message}`);
        }
    }
}
