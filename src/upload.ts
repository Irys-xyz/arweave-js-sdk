import { createData, DataItem } from "arbundles";
import { readFileSync, promises, PathLike } from "fs";
import mime from "mime-types";
import Api from "arweave/node/lib/api";
import { AxiosResponse } from "axios";
import { Currency } from "./currencies";
import * as p from "path"
import FastGlob from "fast-glob";
import Utils from "./utils"
//import PromisePool from "@supercharge/promise-pool"


export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const checkPath = async (path: PathLike): Promise<boolean> => { return promises.stat(path).then(_ => true).catch(_ => false) }
export default class Uploader {
    private readonly api: Api
    private currency: string;
    private currencyConfig: Currency;
    private utils: Utils
    //private syncMutex: boolean;

    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
        this.utils = utils;
    }



    /**
 * Uploads a file to the bundler
 * @param path to the file to be uploaded
 * @returns the response from the bundler
 */
    public async uploadFile(path: string): Promise<AxiosResponse<any>> {
        if (! await checkPath(path)) {
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
        return await this.dataItemUploader(dataItem);
    }

    public async uploadFolder(path: string, indexFile?: string): Promise<string> {
        path = p.resolve(path);
        let alreadyProcessed = [];
        if (! await checkPath(path)) {
            throw new Error(`Unable to access path: ${path}`);
        }

        // manifest operations
        const manifestPath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`)
        let manifest = {
            "manifest": "arweave/paths",
            "version": "0.1.0",
            "paths": {}
        }
        if (await checkPath(manifestPath)) {
            const d = await promises.readFile(manifestPath);
            manifest = d.length > 0 ? JSON.parse((d).toString()) : manifest
            alreadyProcessed = Object.keys(manifest.paths);
        }
        if (indexFile) {
            indexFile = p.join(path, indexFile);
            if (!await checkPath(indexFile)) {
                throw new Error(`Unable to access path: ${indexFile}`)
            }
            manifest["index"] = { path: p.relative(path, indexFile) };

        }
        await this.syncManifest(manifest, manifestPath);
        let files = await FastGlob([`${path}/**/*`], { dot: false });

        //find already deployed files and remove them from the processing queue.
        files = files.filter((el) => !alreadyProcessed.includes(p.relative(path, el)));

        if (files.length == 0) {
            console.log("No items to process")
            //return the txID of the last deploy 
            const idpath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`)
            if (await checkPath(idpath)) {
                return (await promises.readFile(idpath)).toString();
            }
            return undefined;
        }
        // TODO: add preflight balance check.
        let total = 0;
        for (let i = 0; i < files.length; i++) {
            total += (await promises.stat(files[i])).size
        }
        console.log(`Total amount of data: ${total} - cost: ${await this.utils.getPrice(this.currency, total)} ${this.currencyConfig.base[0]}`)

        return (await this.bulkUploader(files, path)).manifestTx ?? "none"
    }



    /**
     * Asynchronous chunking uploader, able to upload an array of dataitems or paths
     * Paths allow for an optional arweave manifest, provided they all have a common base path <path>
     * Syncs manifest to disk every 5 (or less) items.
     * @param items - Array of DataItems or paths
     * @param path  - Common base path for provided path items
     * @returns - object containing responses for successful and failed items, as well as the manifest Txid if applicable
     */
    public async bulkUploader(items: DataItem[] | string[], path?: string): Promise<{ processed: Map<string, any>, failed: Map<string, any>, manifestTx?: string }> {

        const promiseFactory = (d: string | DataItem, x: number): Promise<Record<string, any>> => {
            return new Promise((r, e) => {
                (typeof d === "string" ? this.uploadFile(d as string) : this.dataItemUploader(d as DataItem))
                    .then(re => r({ i: x, d: re })).catch(er => e({ i: x, e: er }))
            })
        }


        const uploaderBlockSize = 5; //TODO: evaluate exposing this as an arg with a default.
        const manifestPath = path ? p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`) : undefined
        const manifest = path ? JSON.parse((await promises.readFile(manifestPath)).toString()) : undefined
        const hasManifest = (manifestPath && typeof items[0] === "string")

        const failed = new Map();
        const processed = new Map()

        try {
            for (let i = 0; i < items.length; i = Math.min(i + uploaderBlockSize, items.length)) {
                const upperb = Math.min(i + uploaderBlockSize, items.length);
                console.log(`processing items ${i} to ${upperb}`);
                const toProcess = items.slice(i, upperb);
                let x = 0;
                const promises = toProcess.map((d: any) => {
                    x++
                    const p = promiseFactory(d, (i + x - 1));
                    return p;
                })
                const processing = await Promise.allSettled(promises);
                //re-process failed promises and add fulfilled ones
                // TODO: fix type
                outerLoop: //loop label magic
                for (let x = 0; x < processing.length; x++) {
                    let pr = processing[x] as any;
                    if (pr.status === "rejected") {
                        const dataItem = items[pr.reason.i]
                        for (let y = 0; y < 3; y++) {
                            await sleep(1000);
                            const d = (await Promise.allSettled([promiseFactory(dataItem, i)]))[0] as any
                            if (d.status === "rejected") {
                                if (d.reason.e.message === "Not enough funds to send data") {
                                    // sync last good state then stop upload.
                                    if (hasManifest) { await this.syncManifest(manifest, manifestPath) }
                                    throw new Error("Ran out of funds");
                                }
                                // console.log(`Error on retry iteration ${i} - ${d.reason}`)
                                if (i == 3) {
                                    failed[d.reason.i] = d.reason.e
                                    break outerLoop
                                }
                            } else {
                                pr = d;
                            }
                        }
                    }
                    //only gets here if the promise/upload succeded
                    processed.set(pr.value.id, pr.value.d)

                    if (hasManifest) {
                        // add to manifest
                        const ind = pr.value.i
                        const it = items[ind];
                        const rel = p.relative(path, it as string);
                        manifest.paths[rel] = { id: pr.value.d.data.id }
                    }
                }
                if (hasManifest) { await this.syncManifest(manifest, manifestPath) }; //checkpoint state then start a new block.
            }

            console.log(`Finished deploying ${items.length} Items (${failed.size} failures)`)
            let manifestTx;
            if (hasManifest) {
                if (failed.size > 0) {
                    console.log("Failures detected - not deploying manifest")
                } else {
                    const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }]
                    manifestTx = await this.upload(Buffer.from(JSON.stringify(manifest)), tags).catch((e) => { throw new Error(`Failed to deploy manifest: ${e}`) })
                    // console.log(manifestTx.data.id)
                    // console.log(`Manifest ID: ${manifestTx.data.id} `);
                    // console.log("Writing manifest ID to disk")
                    await promises.writeFile(p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`), manifestTx.data.id)
                }
            }
            //return manifestTx.data.id;
            return { processed, failed, manifestTx: manifestTx?.data.id }

        } catch (err) {
            console.log(`Error whilst deploying: ${err} `);
            await this.syncManifest(manifest, manifestPath);
            return { processed, failed }
        }
    }

    /**
     * Uploads a given dataItem to the bundler
     * @param dataItem 
     */
    public async dataItemUploader(dataItem: DataItem): Promise<AxiosResponse<any>> {

        const { protocol, host, port } = this.api.getConfig();
        const res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
            headers: { "Content-Type": "application/octet-stream", },
            timeout: 100000,
            maxBodyLength: Infinity,
            validateStatus: (status) => (status > 202 && status < 300) || status !== 402
        })
        if (res.status === 402) {
            throw new Error("Not enough funds to send data")
        }
        return res;
    }

    private async syncManifest(manifest: { manifest: string; version: string; paths: Record<string, any>; }, manifestPath: PathLike | promises.FileHandle): Promise<void> {
        promises.writeFile(manifestPath, Buffer.from(JSON.stringify(manifest))).catch(e => {
            console.log(`Error syncing manifest: ${e}`);
        })//.finally(() => {
        //     this.syncMutex = false
        // });
    }

    // private async waitForMutex(): Promise<void> {
    //     while (this.syncMutex) {
    //         sleep(4);
    //     }
    //     return;
    // }


}

