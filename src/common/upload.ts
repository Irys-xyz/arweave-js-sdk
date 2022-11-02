import { createData, DataItem, DataItemCreateOptions } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "./api";
import { Currency, Manifest, UploadResponse } from "./types";
import PromisePool from "@supercharge/promise-pool/dist";
import retry from "async-retry";
import { ChunkingUploader } from "./chunkingUploader";
import { Readable } from "stream";
import Crypto from "crypto";

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export const CHUNKING_THRESHOLD = 50_000_000;
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
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    public async uploadTransaction(transaction: DataItem | Readable | Buffer): Promise<AxiosResponse<UploadResponse>> {
        let res: AxiosResponse<UploadResponse>;
        const isDataItem = DataItem.isDataItem(transaction);
        if (this.forceUseChunking || (isDataItem && transaction.getRaw().length >= CHUNKING_THRESHOLD) || !isDataItem) {
            res = await this.chunkedUploader.uploadTransaction(isDataItem ? transaction.getRaw() : transaction);
        } else {
            const { protocol, host, port, timeout } = this.api.getConfig();
            res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, transaction.getRaw(), {
                headers: { "Content-Type": "application/octet-stream" },
                timeout,
                maxBodyLength: Infinity
            });
            if (res.status == 201) {
                throw new Error(res.data as any as string);
            }
        }
        switch (res.status) {
            case 402:
                throw new Error("Not enough funds to send data");
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading Bundlr transaction: ${res.status} ${res.statusText}`);
                }
        }
        return res;
    }

    public async uploadData(data: string | Buffer | Readable, opts?: DataItemCreateOptions): Promise<UploadResponse> {
        if (typeof data === "string") {
            data = Buffer.from(data);
        }
        if (Buffer.isBuffer(data)) {
            if (data.length <= CHUNKING_THRESHOLD) {
                const dataItem = createData(data, this.currencyConfig.getSigner(), { ...opts, anchor: opts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32) });
                await dataItem.sign(this.currencyConfig.getSigner());
                return (await this.uploadTransaction(dataItem)).data;
            }
        }
        return (await this.chunkedUploader.uploadData(data, opts)).data;
    }



    // concurrently uploads transactions
    public async concurrentUploader(data: (DataItem | Buffer | Readable)[], concurrency = 5, resultProcessor?: (res: any) => Promise<any>, logFunction?: (log: string) => Promise<any>): Promise<{ errors: Array<any>, results: Array<any>; }> {
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

    protected async processItem(data: string | Buffer | Readable | DataItem, opts?: DataItemCreateOptions): Promise<any> {
        if (DataItem.isDataItem(data)) {
            return this.uploadTransaction(data);
        }
        return this.uploadData(data, opts);
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

    get chunkedUploader() {
        return new ChunkingUploader(this.currencyConfig, this.api);
    }


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

