import { createData, DataItem } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils"
import Api from "./api";
import { Currency, Manifest } from "./types";
import PromisePool from "@supercharge/promise-pool/dist";
import retry from "async-retry";
// import Chunker from "stream-chunker"
import { Readable } from "stream";
import { SizeChunker } from "chunking-streams"
// import mime from "mime-types";

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class Uploader {
    protected readonly api: Api
    protected currency: string;
    protected currencyConfig: Currency;
    protected utils: Utils
    protected contentTypeOverride: string
    protected forceUseChunking: boolean

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
        let res: AxiosResponse<any>
        const length = dataItem.getRaw().length
        if (this.forceUseChunking || length > 25_000_000) {
            res = await this.chunkedDataItemUploader(Readable.from(dataItem.getRaw()), dataItem.id, length)
        } else {
            const { protocol, host, port, timeout } = this.api.getConfig();
            res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
                headers: { "Content-Type": "application/octet-stream" },
                timeout,
                maxBodyLength: Infinity
            })
        }
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




    public async concurrentUploader(data: (DataItem | Buffer | string)[], concurrency = 5, resultProcessor?: (res: any) => Promise<any>, logFunction?: (log: string) => Promise<any>): Promise<{ errors: Array<any>, results: Array<any> }> {
        const errors = []
        const results = await PromisePool
            .for(data)
            .withConcurrency(concurrency >= 1 ? concurrency : 5)
            .handleError(async (error, _) => {
                errors.push(error)
                if (error.message === "Not enough funds to send data") {
                    throw error;
                }
            })
            .process(async (item, i, _) => {
                await retry(
                    async (bail) => {
                        try {
                            const res = await this.processItem(item)
                            if (i % concurrency == 0) {
                                await logFunction(`Processed ${i} Items`)
                            }
                            if (resultProcessor) {
                                return await resultProcessor({ item, res, i })
                            } else {
                                return { item, res, i }
                            }
                        } catch (e) {
                            if (e.message === "Not enough funds to send data") {
                                bail(e)
                            }
                            throw e
                        }
                    },
                    { retries: 3, minTimeout: 1000, maxTimeout: 10_000 }
                );

            }) as any
        return { errors, results: results.results }
    }

    protected async processItem(item: string | Buffer | DataItem): Promise<any> {
        if (typeof item === "string") {
            item = Buffer.from(item)
        }
        if (Buffer.isBuffer(item)) {
            const signer = await this.currencyConfig.getSigner();
            item = createData(item, signer)
            await item.sign(signer)
        }
        return await this.dataItemUploader(item);
    }

    /**
     * geneates a manifest JSON object 
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest 
     * @returns 
     */
    public async generateManifest(config: { items: Map<string, string>, indexFile?: string }): Promise<Manifest> {
        const { items, indexFile } = config
        const manifest = {
            manifest: "arweave/paths",
            version: "0.1.0",
            paths: {}
        }
        if (indexFile) {

            if (!items.has(indexFile)) {
                throw new Error(`Unable to access item: ${indexFile}`)
            }
            manifest["index"] = { path: indexFile };
        }
        for (const [k, v] of items.entries()) {
            manifest.paths[k] = { id: v }
        }
        return manifest

    }

    set contentType(type: string) {
        // const fullType = mime.contentType(type)
        // if(!fullType){
        //     throw new Error("Invali")
        // }
        this.contentTypeOverride = type;
    }

    /**
     * Chunking data uploader
     * @param dataStream - Readble of a pre-signed dataItem
     * @param id - the ID of the dataItem
     * @param size - the size of the dataItem
     * @param chunkSize - optional size to chunk the file - min 100_000, max 190_000_000 (in bytes)
     * @param batchSize - number of chunks to concurrently upload
     */
    public async chunkedDataItemUploader(dataStream: Readable, id: string, size: number, chunkSize = 25_000_000, batchSize = 5,): Promise<any> {

        if (chunkSize < 1_000_000 || chunkSize > 190_000_000) {
            throw new Error("Invalid chunk size - must be betweem 100,000 and 190,000,000 bytes")
        }
        if (batchSize < 1) {
            throw new Error("batch size too small! must be >=1")
        }

        const promiseFactory = (d: Buffer, o: number): Promise<Record<string, any>> => {
            return new Promise((r, e) => {
                retry(
                    async () => {
                        this.api.post(`/chunks/${this.currency}/${id}/${o}`, d, {
                            headers: { "Content-Type": "application/octet-stream" },
                            maxBodyLength: Infinity, // 
                            maxContentLength: Infinity,
                        }).then(re => r({ o, d: re })).catch(er => e({ o, e: er }))
                    }
                ),
                    { retries: 3, minTimeout: 1000, maxTimeout: 10_000 }
            })

        }

        // retry the entire upload/any failing sections (will skip over valid sections)
        return await retry(async (bail) => {

            const getres = await this.api.get(`/chunks/${this.currency}/${id}/${size}`)
            await Utils.checkAndThrow(getres, "Getting chunk info")
            const present = getres.data.map(v => +v) as Array<number>

            const remainder = size % chunkSize;
            const chunks = (size - remainder) / chunkSize;

            const missing = [];
            for (let i = 0; i < chunks + 1; i++) {
                const s = i * chunkSize
                if (!present.includes(s)) {
                    missing.push(s);
                }
            }
            console.log(missing);

            let offset = 0;
            const processing = []

            const ckr = SizeChunker({
                chunkSize: chunkSize,
                flushTail: true
            })
            dataStream.pipe(ckr)

            for await (const chunk of ckr) {
                const data = chunk.data
                offset += data.length
                if (chunk.id % batchSize == 0) {
                    await Promise.allSettled(processing)
                }
                console.log(`posting chunk ${chunk.id} - ${offset}`)
                if (missing.includes(offset) || offset == size) {
                    processing.push(promiseFactory(data, offset - data.length))
                }
            }



            await Promise.allSettled(processing);
            const finishUpload = await this.api.post(`/chunks/${this.currency}/${id}/-1`, null, {
                headers: { "Content-Type": "application/octet-stream" },
                timeout: 100_000 // server side reconstruction can take a while
            })
            if (finishUpload.status === 402) {
                bail(new Error("Not enough funds to send data"))
            }
            // this will throw if the dataItem reconstruction fails
            await Utils.checkAndThrow(finishUpload, "Finalising upload")
            return finishUpload

            // const postRes = await new Promise(res => {
            //     cstrm.on("finish", async () => {
            //         // wait for all chunks to be uploaded
            //         await Promise.allSettled(processing)
            //         // finish off the upload
            //         const finishUpload = await this.api.post(`/chunks/${this.currency}/${id}/-1`, null, {
            //             headers: { "Content-Type": "application/octet-stream" },
            //             timeout: 100_000 // server side reconstruction can take a while
            //         })
            //         if (finishUpload.status === 402) {
            //             bail(new Error("Not enough funds to send data"))
            //         }
            //         // this will throw if the dataItem reconstruction fails
            //         await Utils.checkAndThrow(finishUpload, "Finalising upload")
            //         res(finishUpload)
            //     })
            //     dataStream.pipe(cstrm)
            // })
            // return postRes // return axios response for successful upload like for non-chunked.

            // cstrm.on("data", async (data: Buffer) => {
            //     cstrm.pause(); // ensure counter sync (and prevent congestion timeouts)
            //     offset += data.length
            //     if (++i % batchSize == 0) {
            //         await Promise.allSettled(processing)
            //     }
            //     console.log(`posting chunk ${++i} - ${offset}`)
            //     if (!missing.includes(offset) && offset != size) { return; } // skip upload if chunk is already processed
            //     processing.push(promiseFactory(data, offset - data.length))
            //     cstrm.resume()
            // })

            // dataStream.pipe(cstrm)
            // for await (const data of cstrm) {
            //     offset += data.length
            //     if (++i % batchSize == 0) {
            //         await Promise.allSettled(processing)
            //     }
            //     if (!missing.includes(offset) && offset != size) { continue; } // skip upload if chunk is already processed
            //     processing.push(promiseFactory(data, offset - data.length))

            // }
            // wait for all chunks to be uploaded
            // await Promise.allSettled(processing)
            // // finish off the upload
            // const finishUpload = await this.api.post(`/chunks/${this.currency}/${id}/-1`, null, {
            //     headers: { "Content-Type": "application/octet-stream" },
            //     timeout: 100_000 // server side reconstruction can take a while
            // })
            // if (finishUpload.status === 402) {
            //     bail(new Error("Not enough funds to send data"))
            // }
            // // this will throw if the dataItem reconstruction fails
            // await Utils.checkAndThrow(finishUpload, "Finalising upload")
            // return finishUpload

        },
            { retries: 3, minTimeout: 1000, maxTimeout: 10_000 }
        )



    }

    set useChunking(state: boolean) {
        if (typeof state === "boolean") {
            this.forceUseChunking = state
        }
    }
}

