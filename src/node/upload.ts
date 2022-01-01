import { readFileSync, promises, PathLike } from "fs";
import { AxiosResponse } from "axios";
import { Currency } from "../common/types";
import Uploader, { sleep } from "../common/upload";
import Api from "../common/api";
import Utils from "../common/utils";
import * as p from "path"
import mime from "mime-types";
import { DataItem } from "arbundles";
import inquirer from "inquirer";

export const checkPath = async (path: PathLike): Promise<boolean> => { return promises.stat(path).then(_ => true).catch(_ => false) }

export default class NodeUploader extends Uploader {

    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency) {
        super(api, utils, currency, currencyConfig);
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
        const mimeType = mime.lookup(path);
        const tags = [{ name: "Content-Type", value: (mimeType ? mimeType : "application/octet-stream") }]
        const data = readFileSync(path);
        return await this.upload(data, tags)
    }

    // the cleanest dir walking code I've ever seen... it's beautiful. 
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private async* walk(dir: string) {
        for await (const d of await promises.opendir(dir)) {
            const entry = p.join(dir, d.name);
            if (d.isDirectory()) yield* await this.walk(entry);
            else if (d.isFile()) yield entry;
        }
    }

    /**
     * Preprocessor for BulkUploader, ensures it has a correct operating environment.
     * @param path - path to the folder to be uploaded
     * @param indexFile - path to the index file (i.e index.html)
     * @param batchSize - number of items to upload concurrently
     * @param interactivePreflight - whether to interactively prompt the user for confirmation of deployment (CLI ONLY)
     * @returns 
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    public async uploadFolder(path: string, indexFile?: string, batchSize?: number, interactivePreflight?: boolean, logFunction?: Function,): Promise<string> {
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
        const files = []
        let total = 0;
        for await (const f of this.walk(path)) {
            if (!alreadyProcessed.includes(p.relative(path, f))) {
                files.push(f)
                total += await (await promises.stat(f)).size
            }
        }
        if (files.length == 0) {
            console.log("No items to process")
            // return the txID of the last deploy
            const idpath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`)
            if (await checkPath(idpath)) {
                return (await promises.readFile(idpath)).toString();
            }
            return undefined;
        }

        const price = await this.utils.getPrice(this.currency, total);

        if (interactivePreflight) {
            if (!(await confirmation(`Authorize Deployment?\nTotal amount of data: ${total} bytes over ${files.length} files - cost: ${price} ${this.currencyConfig.base[0]}\n Y / N`))) { throw new Error("Confirmation failed") }
        }

        // invoke bulkuploader, with inline fallback to console.log if no logging function is given and interactive preflight is on.
        return (await this.bulkUploader(files, path, batchSize, (logFunction ?? (interactivePreflight ? console.log : undefined)))).manifestTx ?? "none"
    }




    private async syncManifest(manifest: { manifest: string; version: string; paths: Record<string, any>; }, manifestPath: PathLike | promises.FileHandle): Promise<void> {
        promises.writeFile(manifestPath, Buffer.from(JSON.stringify(manifest, null, 4))).catch(e => {
            console.log(`Error syncing manifest: ${e}`);
        })
    }


    /**
     * Asynchronous chunking uploader, able to upload an array of dataitems or paths
     * Paths allow for an optional arweave manifest, provided they all have a common base path <path>
     * Syncs manifest to disk every 5 (or less) items.
     * @param items - Array of DataItems or paths
     * @param path  - Common base path for provided path items
     * @param batchSize - number of items to upload concurrently
     * @param logFunction - function to use for logging, defaults to voiding logs. should take a string to log as the first arg, can be async.
     * @returns - object containing responses for successful and failed items, as well as the manifest Txid if applicable
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    public async bulkUploader(items: DataItem[] | string[], path?: string, batchSize = 5, logFunction: Function = async (_): Promise<void> => { return }): Promise<{ processed: Map<string, any>, failed: Map<string, any>, manifestTx?: string, logs?}> {
        const promiseFactory = (d: string | DataItem, x: number): Promise<Record<string, any>> => {
            return new Promise((r, e) => {
                (typeof d === "string" ? this.uploadFile(d as string) : this.dataItemUploader(d as DataItem))
                    .then(re => r({ i: x, d: re })).catch(er => e({ i: x, e: er }))
            })
        }

        const uploaderBlockSize = (batchSize > 0) ? batchSize : 5;
        const manifestPath = path ? p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`) : undefined
        const manifest = path ? JSON.parse((await promises.readFile(manifestPath)).toString()) : undefined
        const hasManifest = (manifestPath && typeof items[0] === "string")

        const failed = new Map();
        const processed = new Map()

        try {
            for (let i = 0; i < items.length; i = Math.min(i + uploaderBlockSize, items.length)) {
                const upperb = Math.min(i + uploaderBlockSize, items.length);
                await logFunction(`Uploading items ${i} to ${upperb}`);
                const toProcess = items.slice(i, upperb);
                let x = 0;
                const promises = toProcess.map((d: any) => {
                    x++
                    const p = promiseFactory(d, (i + x - 1));
                    return p;
                })
                const processing = await Promise.allSettled(promises);
                outerLoop:
                for (let x = 0; x < processing.length; x++) {
                    let pr = processing[x] as any;
                    if (pr.status === "rejected") {
                        const dataItem = items[pr.reason.i]
                        for (let y = 0; y < 3; y++) {
                            await sleep(1000);
                            const d = (await Promise.allSettled([promiseFactory(dataItem, i)]))[0] as any
                            if (d.status === "rejected") {
                                if (d.reason.e.message === "Not enough funds to send data") {
                                    if (hasManifest) { await this.syncManifest(manifest, manifestPath) }
                                    throw new Error("Ran out of funds");
                                }
                                if (i == 3) {
                                    failed[d.reason.i] = d.reason.e
                                    break outerLoop
                                }
                            } else {
                                pr = d;
                            }
                        }
                    }
                    // only gets here if the promise/upload succeeded
                    processed.set(pr.value.id, pr.value.d)

                    if (hasManifest) {
                        // add to manifest
                        const ind = pr.value.i
                        const it = items[ind];
                        const rel = p.relative(path, it as string);
                        manifest.paths[rel] = { id: pr.value.d.data.id }
                    }
                }
                if (hasManifest) { await this.syncManifest(manifest, manifestPath) }; // checkpoint state then start a new block.
            }

            await logFunction(`Finished deploying ${items.length} items (${failed.size} failures)`)
            let manifestTx: AxiosResponse<any>;
            if (hasManifest) {
                if (failed.size > 0) {
                    await logFunction("Failures detected - not deploying manifest")
                } else {
                    const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }]
                    manifestTx = await this.upload(Buffer.from(JSON.stringify(manifest)), tags).catch((e) => { throw new Error(`Failed to deploy manifest: ${e.message}`) })
                    await promises.writeFile(p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`), manifestTx.data.id)
                }
            }
            return { processed, failed, manifestTx: manifestTx?.data.id }

        } catch (err) {
            await logFunction(`Error whilst deploying: ${err.message} `);
            await this.syncManifest(manifest, manifestPath);
            return { processed, failed }
        }
    }

}

async function confirmation(message: string): Promise<boolean> {

    const answers = await inquirer.prompt([
        { type: "input", name: "confirmation", message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}
