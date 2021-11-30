import { createData, DataItem } from "arbundles";
import { readFileSync, promises } from "fs";
import mime from "mime-types";
import Api from "arweave/node/lib/api";
import { AxiosResponse } from "axios";
import { Currency } from "./currencies";
import { sleep } from "./currencies/utils"

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
     * @param onDemandtx the TX id of an on-demand TX.
     * @returns the response from the bundler
     */
    public async uploadFile(path: string, onDemandtx?: string): Promise<AxiosResponse<any>> {
        if (!promises.stat(path).then(_ => true).catch(_ => false)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        //const signer = await this.currencyConfig.getSigner();
        const mimeType = mime.lookup(path);
        const tags = [{ name: "Content-Type", value: (mimeType ? mimeType : "application/octet-stream") }]
        const data = readFileSync(path);
        return await this.upload(data, tags, onDemandtx)
    }

    /**
     * Uploads data to the bundler
     * @param data
     * @param tags
     * @returns the response from the bundler
     */
    public async upload(data: Buffer, tags?: { name: string, value: string }[], onDemandTx?: string): Promise<AxiosResponse<any>> {
        // try {
        const signer = await this.currencyConfig.getSigner();
        const dataItem = createData(
            data,
            signer,
            { tags }
        );
        await dataItem.sign(signer);
        return this.dataItemUploader(dataItem, onDemandTx);
    }
    /**
     * Assumes the dataItem needs no further preperation, and directly posts it to the bundlr node.
     * @param dataItem 
     * @returns 
     */
    public async dataItemUploader(dataItem: DataItem, onDemandTx?: string): Promise<AxiosResponse<any>> {
        const { protocol, host, port } = this.api.getConfig();
        const headers = { "Content-Type": "application/octet-stream", }
        if (onDemandTx) {
            const c = this.currencyConfig[this.currency];
            //poll for confirmation
            let i = 0;
            for (i; i < 10; i++) {
                const tx = await c.getTx(onDemandTx);
                if (tx.confirmed) { break; }
                await sleep(1000);
            }
            if (i == 9) { // time it out.
                throw new Error(`Timed out polling for on demand payment TX confirmation - TxID: ${onDemandTx}`)
            }
            Object.assign({ "x-bundlr-pay": onDemandTx }, headers);
        }
        //onDemandTx is confirmed
        const res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
            headers,
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
