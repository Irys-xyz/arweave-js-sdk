import { createData } from "arbundles";
import { readFileSync, promises } from "fs";
import mime from "mime-types";
import Api from "arweave/node/lib/api";
import { AxiosResponse } from "axios";
import { Currency } from "./currencies";

export default class Uploader {
    private readonly api: Api
    private currency: string;
    private currencyConfig: Currency;

    constructor(api: Api, currency: string, currencyConfig: Currency) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
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
        const tags = [{ name: "Content-Type", value: mimeType }]
        const data = readFileSync(path);
        return await this.upload(data, tags)
    }

    /**
     * Uploads data to the bundler
     * @param data
     * @param tags
     * @returns the response from the bundler
     */
    public async upload(data: Buffer, tags: { name: string, value: string }[]): Promise<AxiosResponse<any>> {
        // try {
        const signer = await this.currencyConfig.getSigner();
        const dataItem = createData(
            data,
            signer,
            { tags }
        );
        await dataItem.sign(signer);
        const { protocol, host, port } = this.api.getConfig();
        const res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
            headers: { "Content-Type": "application/octet-stream", },
            timeout: 100000,
            maxBodyLength: Infinity,
            validateStatus: (status) => (status > 200 && status < 300) || status !== 402
        })
        if (res.status === 402) {
            throw new Error("Not enough funds to send data")
        }
        return res;
    }
}
