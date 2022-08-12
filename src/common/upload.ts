import { createData, DataItem } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "./api";
import { Currency, Manifest } from "./types";
import PromisePool from "@supercharge/promise-pool/dist";
import retry from "async-retry";
import Crypto from "crypto";
import { ChunkUploader } from "./chunkUploader";
import { Readable } from "stream";

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class Uploader {
    protected readonly api: Api;
    protected currency: string;
    protected currencyConfig: Currency;
    protected utils: Utils;
    protected contentTypeOverride: string;
    protected forceUseChunking: boolean;

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
    public async upload(data: Buffer, tags?: { name: string, value: string; }[]): Promise<AxiosResponse<any>> {

        const signer = await this.currencyConfig.getSigner();
        const dataItem = createData(
            data,
            signer,
            { tags, anchor: Crypto.randomBytes(32).toString("base64").slice(0, 32) }
        );
        await dataItem.sign(signer);
        return await this.transactionUploader(dataItem);
    }


    get chunkedUploader() {
        return new ChunkUploader(this.currencyConfig, this.api);
    }

    /**
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    public async transactionUploader(transaction: DataItem | Readable): Promise<AxiosResponse<any>> {
        let res: AxiosResponse<any>;
        const isDataItem = transaction instanceof DataItem;
        if (this.forceUseChunking || (isDataItem && transaction.getRaw().length > 50_000_000) || !isDataItem) {
            const uploader = this.chunkedUploader;
            res = await uploader.uploadTransaction(isDataItem ? transaction.getRaw() : transaction);
        } else {
            const { protocol, host, port, timeout } = this.api.getConfig();
            res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, transaction.getRaw(), {
                headers: { "Content-Type": "application/octet-stream" },
                timeout,
                maxBodyLength: Infinity
            });
        }
        switch (res.status) {
            // case 201:
            //     res.data = { id: transaction.id };
            //     return res;
            case 402:
                throw new Error("Not enough funds to send data");
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading DataItem: ${res.status} ${res.statusText}`);
                }
        }
        return res;
    }




    public async concurrentUploader(data: (DataItem | Buffer | string)[], concurrency = 5, resultProcessor?: (res: any) => Promise<any>, logFunction?: (log: string) => Promise<any>): Promise<{ errors: Array<any>, results: Array<any>; }> {
        const errors = [];
        const results = await PromisePool
            .for(data)
            .withConcurrency(concurrency >= 1 ? concurrency : 5)
            .handleError(async (error, _) => {
                errors.push(error);
                if (error.message === "Not enough funds to send data") {
                    throw error;
                }
            })
            .process(async (item, i, _) => {
                await retry(
                    async (bail) => {
                        try {
                            const res = await this.processItem(item);
                            if (i % concurrency == 0) {
                                await logFunction(`Processed ${i} Items`);
                            }
                            if (resultProcessor) {
                                return await resultProcessor({ item, res, i });
                            } else {
                                return { item, res, i };
                            }
                        } catch (e) {
                            if (e.message === "Not enough funds to send data") {
                                bail(e);
                            }
                            throw e;
                        }
                    },
                    { retries: 3, minTimeout: 1000, maxTimeout: 10_000 }
                );

            }) as any;
        return { errors, results: results.results };
    }

    protected async processItem(item: string | Buffer | DataItem): Promise<any> {
        if (typeof item === "string") {
            item = Buffer.from(item);
        }
        if (Buffer.isBuffer(item)) {
            const signer = await this.currencyConfig.getSigner();
            item = createData(item, signer, { anchor: Crypto.randomBytes(32).toString("base64").slice(0, 32) });
            await item.sign(signer);
        }
        return await this.transactionUploader(item);
    }

    /**
     * geneates a manifest JSON object 
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest 
     * @returns 
     */
    public async generateManifest(config: { items: Map<string, string>, indexFile?: string; }): Promise<Manifest> {
        const { items, indexFile } = config;
        const manifest = {
            manifest: "arweave/paths",
            version: "0.1.0",
            paths: {}
        };
        if (indexFile) {

            if (!items.has(indexFile)) {
                throw new Error(`Unable to access item: ${indexFile}`);
            }
            manifest["index"] = { path: indexFile };
        }
        for (const [k, v] of items.entries()) {
            manifest.paths[k] = { id: v };
        }
        return manifest;

    };







    set useChunking(state: boolean) {
        if (typeof state === "boolean") {
            this.forceUseChunking = state;
        }
    }

    set contentType(type: string) {
        // const fullType = mime.contentType(type)
        // if(!fullType){
        //     throw new Error("Invali")
        // }
        this.contentTypeOverride = type;
    }
}

