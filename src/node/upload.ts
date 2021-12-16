import { readFileSync, promises } from "fs";
import mime from "mime-types";
import { AxiosResponse } from "axios";
import { Currency } from "./currencies";
import Uploader from "../common/upload";
import Api from "../common/api";

export default class NodeUploader extends Uploader {

    constructor(api: Api, currency: string, currencyConfig: Currency) {
        super(api, currency, currencyConfig);
    }
    /**
     * Uploads a file to the bundler
     * @param path to the file to be uploaded
     * @returns the response from the bundler
     */
    public async uploadFile(path: string): Promise<AxiosResponse<any>> {
        if (!promises.stat(path).then(_ => true).catch(_ => false)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        //const signer = await this.currencyConfig.getSigner();
        const mimeType = mime.lookup(path);
        const tags = [{ name: "Content-Type", value: (mimeType ? mimeType : "application/octet-stream") }]
        const data = readFileSync(path);
        return await this.upload(data, tags)
    }

}
