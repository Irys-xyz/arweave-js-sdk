import { createData, DataItem } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils"
import Api from "./api";
import { Currency } from "./types";

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export default class Uploader {
    protected readonly api: Api
    protected currency: string;
    protected currencyConfig: Currency;
    protected utils: Utils

    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
        this.utils = utils;
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
        return await this.dataItemUploader(dataItem);
    }


    /**
     * Uploads a given dataItem to the bundler
     * @param dataItem
     */
    public async dataItemUploader(dataItem: DataItem): Promise<AxiosResponse<any>> {

        const { protocol, host, port, timeout } = this.api.getConfig();
        const res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
            headers: { "Content-Type": "application/octet-stream" },
            timeout,
            maxBodyLength: Infinity
        })
        switch (res.status) {
            case 201:
                res.data = { id: dataItem.id }
                return res;
            case 402:
                throw new Error("Not enough funds to send data")
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading DataItem: ${res.status} ${res.statusText}`)
                }
        }
        return res;
    }

}
