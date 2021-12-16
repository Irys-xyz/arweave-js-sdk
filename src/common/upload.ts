import { createData, DataItem } from "arbundles";
import { AxiosResponse } from "axios";
import Api from "./api";
import { Currency } from "../node/currencies";

export default class Uploader {
    protected api: Api
    protected currency: string;
    protected currencyConfig: Currency;

    constructor(api: Api, currency: string, currencyConfig: Currency) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
    }

    /**
     * Uploads data to the bundler
     * @param data
     * @param tags
     * @returns the response from the bundler
     */
    public async upload(data: Buffer, tags?: { name: string, value: string }[]): Promise<AxiosResponse<any>> {
        // try {
        const signer = await this.currencyConfig.getSigner();
        const dataItem = createData(
            data,
            signer,
            { tags }
        );
        await dataItem.sign(signer);
        return this.dataItemUploader(dataItem);
    }
    /**
     * Assumes the dataItem needs no further preperation, and directly posts it to the bundlr node.
     * @param dataItem 
     * @returns 
     */

    public async dataItemUploader(dataItem: DataItem): Promise<AxiosResponse<any>> {
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
