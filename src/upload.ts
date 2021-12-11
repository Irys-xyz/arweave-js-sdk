import { createData, DataItem } from "arbundles";
import { readFileSync, promises, PathLike } from "fs";
import mime from "mime-types";
import Api from "arweave/node/lib/api";
import { AxiosResponse } from "axios";
import { Currency } from "./currencies";
import * as p from "path"
import FastGlob from "fast-glob";
//import PromisePool from "@supercharge/promise-pool"


export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const checkPath = async (path: PathLike): Promise<boolean> => { return promises.stat(path).then(_ => true).catch(_ => false) }
export default class Uploader {
    private readonly api: Api
    private currency: string;
    private currencyConfig: Currency;
    private syncMutex: boolean;

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
            manifest = JSON.parse((await promises.readFile(manifestPath)).toString());
        }
        if (indexFile) {
            indexFile = p.join(path, indexFile);
            if (!await checkPath(indexFile)) {
                throw new Error(`Unable to access path: ${indexFile}`)
            }
            manifest["index"] = { path: p.relative(path, indexFile) };
        }
        await this.syncManifest(manifest, manifestPath);
        const files = await FastGlob([`${path}/**/*`], { dot: false });

        //find already deployed files and remove them from the processing queue.

        await this.bulkUploader(files, path)
        return "done"
    }



    public async bulkUploader(items: DataItem[] | string[], path?: string): Promise<void> {

        const promiseFactory = (d: string | DataItem, x: number): Promise<Record<string, any>> => {
            return new Promise((r, e) => {
                (typeof d === "string" ? this.uploadFile(d as string) : this.dataItemUploader(d as DataItem))
                    .then(re => r({ i: x, d: re })).catch(er => e({ i: x, e: er }))
            })
        }
        // p.value: {r : axios response from uploader, i: index of the dataItem } (state: fulfilled)

        const uploaderBlockSize = 5; //TODO: evaluate exposing this as an arg with a default.
        const manifestPath = path ? p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`) : undefined
        const manifest = path ? JSON.parse((await promises.readFile(manifestPath)).toString()) : undefined

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
                for (let x = 0; x < processing.length; x++) {
                    let pr = processing[x] as any;
                    if (pr.status === "rejected") {
                        const dataItem = items[pr.reason.i]
                        for (let y = 0; y < 3; y++) {
                            await sleep(1000);
                            const d = (await Promise.allSettled([promiseFactory(dataItem, i)]))[0] as any
                            if (d.status === "rejected") {
                                if (d.reason.e.message === "Not enough funds to send data") {
                                    console.log("ran out of funds!")
                                    // sync last good state then stop upload.
                                    if (manifestPath) { await this.syncManifest(manifest, manifestPath) }
                                    throw new Error("Ran out of funds");
                                }
                                console.log(`Error on retry iteration ${i} - ${d.reason}`)
                                if (i == 3) {
                                    failed[d.reason.i] = d.reason.e
                                    return;
                                }
                            } else {
                                pr = d;
                                return;
                            }
                        }
                    }
                    //only gets here if the promise/upload succeded
                    processed.set(pr.value.id, pr.value.d)

                    // add to manifest
                    const ind = pr.value.i
                    const it = items[ind];
                    if (manifestPath) {
                        //const proc = processed;
                        const rel = p.relative(path, it as string);
                        manifest.paths[rel] = { id: pr.value.d.data.id }
                    }
                    console.log(manifest)
                }
                if (manifestPath) { await this.syncManifest(manifest, manifestPath) }; //checkpoint state then start a new block.
            }

            console.log(`Finished deploying ${items.length} Items(${failed.size} failures)`)

            const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }]
            const manifestTx = await this.upload(Buffer.from(JSON.stringify(manifest)), tags)
            console.log(manifestTx.data.id)
            console.log(`Manifest ID: ${manifestTx.data.id} `);
            return manifestTx.data.id;

        } catch (err) {
            console.log(`Error whilst deploying: ${err} `);
        }

        //     await PromisePool
        // .for(items as any[])
        // .withConcurrency(5)
        // .handleError(async (error, item, pool) => {
        //     console.log(`Error: ${JSON.stringify(error)} `);
        //     let res;
        //     for (let i = 0; i < 3; i++) {
        //         await sleep(1000);
        //         try {
        //             res = await (typeof item === "string" ? this.uploadFile(item as string) : this.dataItemUploader(item as DataItem))
        //             return; //if it doesn't error resolve
        //         } catch (e) {
        //             console.log(`Error on retry iteration ${i} `)
        //             if (e.message == "Not enough funds to send data") {
        //                 console.log("ran out of funds!")
        //                 pool.stop();
        //             }
        //         }
        //         processed.set(res.data.id,)
        //     }
        //     console.log(`failed to upload dataItem with ID ${dataItem.id} `);

        // })
        // .process(async (item: DataItem | string, index, _pool) => {
        //     const res = await (typeof item === "string" ? this.uploadFile(item as string) : this.dataItemUploader(item as DataItem))
        //     if (manifestPath) {
        //         if (index % 10 == 1) { //sync every 10 operations
        //             await this.syncManifest(manifest, manifestPath);
        //         }

        //         await this.dataItemUploader(dataItem);
        //         await this.waitForMutex();
        //     }
        // })
        // .then(async () => {
        //     await this.syncManifest();
        //     // upload the manifest
        //     // const m = new FileDataItem(this.manifestPath)
        //     // await m.sign();
        //     // await this.dataItemUploader(m);
        //     await this.upload(Buffer.from(JSON.stringify(this.manifest)), []);
        // })
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
        await this.waitForMutex();
        this.syncMutex = true;
        await sleep(40);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setTimeout((_m) => {
            _m = false;
        }, 2000, this.syncMutex)
        promises.writeFile(manifestPath, Buffer.from(JSON.stringify(manifest))).catch(e => {
            console.log(`Error syncing manifest: ${JSON.stringify(e)}`);
        }).finally(() => {
            this.syncMutex = false
        });
    }

    private async waitForMutex(): Promise<void> {
        while (this.syncMutex) {
            sleep(4);
        }
        return;
    }


}

