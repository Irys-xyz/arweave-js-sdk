import { createData, DataItem, DataItemCreateOptions, deepHash } from "arbundles";
import { PassThrough, Readable } from "stream";
import { EventEmitter } from "events";
import Api from "./api";
import { Currency } from "./types";
import Utils from "./utils";
import Crypto from "crypto";
import { stringToBuffer } from "arweave/web/lib/utils";
import retry from "async-retry";
import { AxiosResponse } from "axios";
import StreamToAsyncIterator from "./s2ai";

interface ChunkUploaderEvents {
    'chunkUpload': ({ id, offset, size, totalUploaded }: { id: number, offset: number, size: number; totalUploaded: number; }) => void;
    'chunkError': ({ id, offset, size, res }: { id: number, offset: number, size: number; res: AxiosResponse<any>; }) => void;
    'resume': () => void;
    'pause': () => void;
    'done': (finishedUpload: any) => void;
}

export declare interface ChunkUploader {
    on<U extends keyof ChunkUploaderEvents>(
        event: U, listener: ChunkUploaderEvents[U]
    ): this;

    emit<U extends keyof ChunkUploaderEvents>(
        event: U, ...args: Parameters<ChunkUploaderEvents[U]>
    ): boolean;
}

export class ChunkUploader extends EventEmitter {
    protected currencyConfig: Currency;
    protected api: Api;
    public uploadID: string;
    protected currency: string;
    protected chunkSize: number;
    protected batchSize: number;
    protected paused: Boolean = false;
    protected isResume: Boolean = false;

    constructor(
        currencyConfig: Currency,
        api: Api
    ) {
        super({ captureRejections: true });
        this.currencyConfig = currencyConfig;
        this.api = api;
        this.currency = this.currencyConfig.name;
        this.chunkSize = 25_000_000;
        this.batchSize = 5;
        this.uploadID = "";
    }

    public setResumeData(uploadID: string | undefined): this {
        if (uploadID) {
            this.uploadID = uploadID;
            this.isResume = true;
        }
        return this;
    }

    /**
     * Note: Will return undefined unless an upload has been started.
     * @returns 
     */
    public getResumeData(): string | undefined {
        return this.uploadID;
    }

    public setChunkSize(size: number) {
        if (size < 1) {
            throw new Error("Invalid chunk size (must be >=1)");
        }
        this.chunkSize = size;
        return this;
    }

    public setBatchSize(size: number) {
        if (size < 1) {
            throw new Error("Invalid batch size (must be >=1)");
        }
        this.batchSize = size;
        return this;
    }

    public pause() {
        this.emit("pause");
        this.paused = true;
    }

    public resume() {
        this.paused = false;
        this.emit("resume");
    }

    public async uploadTransaction(data: Readable | Buffer | DataItem) {
        if (DataItem.isDataItem(data)) {
            return this.runUpload(data.getRaw());
        } else {
            return this.runUpload(data);
        }

    }

    public async uploadData(dataStream: Readable | Buffer, transactionOpts?: DataItemCreateOptions) {
        return this.runUpload(dataStream, { ...transactionOpts });
    }

    async runUpload(
        dataStream: Readable | Buffer,
        transactionOpts?: DataItemCreateOptions
    ) {
        let id = this.uploadID;

        const isTransaction = (transactionOpts === undefined);

        const headers = { "x-chunking-version": "2" };

        let getres;
        if (!id) {
            getres = await this.api.get(`/chunks/${this.currency}/-1/-1`, { headers });
            Utils.checkAndThrow(getres, "Getting upload token");
            this.uploadID = id = getres.data.id;

        } else {
            getres = await this.api.get(`/chunks/${this.currency}/${id}/-1`, { headers });
            if (getres.status === 404) throw new Error(`Upload ID not found - your upload has probably expired.`);
            Utils.checkAndThrow(getres, "Getting upload info");
            if (this.chunkSize != +getres.data.size) {
                throw new Error(`Chunk size not equal to that of a previous upload (${+getres.data.size}).`);
            }
        }

        const { max, min } = getres.data;
        if (this.chunkSize < +min || this.chunkSize > +max) {
            throw new Error(`Chunk size out of allowed range: ${min} - ${max}`);
        }
        let totalUploaded = 0;
        const promiseFactory = (d: Buffer, o: number, c: number): Promise<Record<string, any>> => {
            return new Promise((r) => {
                retry(
                    async () => {
                        await this.api.post(`/chunks/${this.currency}/${id}/${o}`, d, {
                            headers: { "Content-Type": "application/octet-stream", ...headers },
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity,
                        }).then(re => {

                            if (re?.status >= 300) {
                                const e = { res: re, id: c, offset: o, size: d.length };
                                this.emit("chunkError", e);
                                throw e;
                            }
                            this.emit("chunkUpload", { id: c, offset: o, size: d.length, totalUploaded: (totalUploaded += d.length) });
                            r({ o, d: re });
                        });
                    }
                ),
                    { retries: 3, minTimeout: 1000, maxTimeout: 10_000 };
            });
        };
        const present = getres.data.chunks ?? [] as [string, number][];

        const stream = new PassThrough();

        let cache = Buffer.alloc(0);
        let ended = false;
        let hasData = true;
        stream.on("end", () => ended = true);
        stream.on("error", (e) => { throw new Error(`Error processing readable: ${e}`); });


        // custom as we need to read any number of bytes.
        const readBytes = async (size: number) => {
            while (!ended) {
                if (cache.length >= size) {
                    data = Buffer.from(cache.slice(0, size)); //force a copy
                    cache = cache.slice(size);
                    return data;
                }
                var data = stream.read(size);
                if (data === null) {
                    // wait for stream refill (perferred over setImmeadiate due to multi env support)
                    await new Promise((r) => setTimeout((r) => r(true), 0, r));
                    continue;
                }
                if (data.length === size) return data;
                cache = Buffer.concat([cache, data]);
            }
            // flush
            while (cache.length >= size) {
                data = Buffer.from(cache.slice(0, size)); //force a copy
                cache = cache.slice(size);
                return data;
            }
            hasData = false;
            return cache;
        };


        let tx: DataItem;

        // doesn't matter if we randomise ID (anchor) between resumes, as the tx header/signing info is always uploaded last.
        if (!isTransaction) {
            tx = createData("", this.currencyConfig.getSigner(),
                {
                    ...transactionOpts,
                    anchor: transactionOpts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32)
                }
            );
            stream.write(tx.getRaw());
            totalUploaded -= tx.getRaw().length;
        }

        if (Buffer.isBuffer(dataStream)) {
            stream.write(dataStream);
            stream.end();
        } else {
            dataStream.pipe(stream);
        }

        let offset = 0;
        let processing = [];
        let chunkID = 0;
        let heldChunk: Buffer;
        let teeStream: PassThrough;
        let deephash: Promise<any>;

        if (!isTransaction) {
            teeStream = new PassThrough();

            const txLength = tx.getRaw().length;

            heldChunk = await readBytes(this.chunkSize);
            chunkID++;
            offset += heldChunk.length;
            teeStream.write(heldChunk.slice(txLength));
            const sigComponents = [
                stringToBuffer("dataitem"),
                stringToBuffer("1"),
                stringToBuffer(tx.signatureType.toString()),
                tx.rawOwner,
                tx.rawTarget,
                tx.rawAnchor,
                tx.rawTags,
                new StreamToAsyncIterator<Buffer>(teeStream)
            ];
            // do *not* await, this needs to process in parallel to the upload process.
            deephash = deepHash(sigComponents);
        }

        let nextPresent = present.pop();

        // Consume data while there's data to read.
        while (hasData) {
            if (this.paused) {
                await new Promise(r => this.on("resume", () => r(undefined)));
            }
            // do not upload data that's already present
            if (nextPresent) {
                const delta = +nextPresent[0] - offset;
                if (delta <= this.chunkSize) {
                    const bytesToSkip = nextPresent[1];
                    const data = await readBytes(bytesToSkip);
                    if (!isTransaction) teeStream.write(data);
                    offset += bytesToSkip;
                    nextPresent = present.pop();
                    chunkID++;
                    totalUploaded += bytesToSkip;
                    continue;
                }
            }
            const chunk = await readBytes(this.chunkSize);
            if (!isTransaction) teeStream.write(chunk);

            if (processing.length == this.batchSize) {
                await Promise.all(processing);
                processing = [];
            }

            processing.push(promiseFactory(chunk, offset, ++chunkID));

            offset += chunk.length;
        }

        if (teeStream) teeStream.end();

        await Promise.all(processing);

        if (!isTransaction) {
            const hash = await deephash;
            const sigBytes = Buffer.from(await this.currencyConfig.getSigner().sign(hash));

            heldChunk.set(sigBytes, 2); // tx will be the first part of the held chunk.

            await promiseFactory(heldChunk, 0, 0);
        }

        const finishUpload = await this.api.post(`/chunks/${this.currency}/${id}/-1`, null, {
            headers: { "Content-Type": "application/octet-stream", ...headers },
            timeout: this.api.config.timeout * 10 // server side reconstruction can take a while
        });
        if (finishUpload.status === 402) {
            throw new Error("Not enough funds to send data");
        }
        // this will throw if the dataItem reconstruction fails
        Utils.checkAndThrow(finishUpload, "Finalising upload", [201]);
        // Recover ID
        if (finishUpload.status === 201) {
            finishUpload.data = { id: finishUpload.statusText.split(" ")?.[1] };
        }
        this.emit("done", finishUpload);
        return finishUpload;
    }

    get completionPromise(): Promise<AxiosResponse<any, any>> {
        return new Promise(r => this.on("done", r));
    }


}


