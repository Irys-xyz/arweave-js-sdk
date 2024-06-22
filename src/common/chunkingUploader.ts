import type { DataItem, DataItemCreateOptions } from "arbundles";
import type { Readable } from "stream";
import { PassThrough } from "stream";
import { EventEmitter } from "events";
import type Api from "./api";
import { UploadHeaders, type Arbundles, type Token, type UploadOptions, type UploadResponse } from "./types";
import Utils from "./utils";
import Crypto from "crypto";
import retry from "async-retry";
import type { AxiosResponse } from "axios";
import StreamToAsyncIterator from "./s2ai";

type ChunkingUploaderEvents = {
  chunkUpload: ({ id, offset, size, totalUploaded }: { id: number; offset: number; size: number; totalUploaded: number }) => void;
  chunkError: ({ id, offset, size, res }: { id: number; offset: number; size: number; res: AxiosResponse }) => void;
  resume: () => void;
  pause: () => void;
  done: (finishedUpload: any) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export declare interface ChunkingUploader {
  on<U extends keyof ChunkingUploaderEvents>(event: U, listener: ChunkingUploaderEvents[U]): this;

  emit<U extends keyof ChunkingUploaderEvents>(event: U, ...args: Parameters<ChunkingUploaderEvents[U]>): boolean;
}

export class ChunkingUploader extends EventEmitter {
  protected tokenConfig: Token;
  protected api: Api;
  public uploadID: string;
  protected token: string;
  protected chunkSize: number;
  protected batchSize: number;
  protected paused = false;
  protected isResume = false;
  protected uploadOptions: UploadOptions | undefined;
  protected arbundles: Arbundles;

  constructor(tokenConfig: Token, api: Api) {
    super({ captureRejections: true });
    this.tokenConfig = tokenConfig;
    this.arbundles = this.tokenConfig.irys.arbundles;
    this.api = api;
    this.token = this.tokenConfig.name;
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

  public setChunkSize(size: number): this {
    if (size < 1) {
      throw new Error("Invalid chunk size (must be >=1)");
    }
    this.chunkSize = size;
    return this;
  }

  public setBatchSize(size: number): this {
    if (size < 1) {
      throw new Error("Invalid batch size (must be >=1)");
    }
    this.batchSize = size;
    return this;
  }

  public pause(): void {
    this.emit("pause");
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
    this.emit("resume");
  }

  public async uploadTransaction(data: Readable | Buffer | DataItem, opts?: UploadOptions): Promise<AxiosResponse<UploadResponse>> {
    this.uploadOptions = opts;
    if (this.arbundles.DataItem.isDataItem(data)) {
      return this.runUpload(data.getRaw());
    } else {
      return this.runUpload(data);
    }
  }

  public async uploadData(
    dataStream: Readable | Buffer,
    options?: DataItemCreateOptions & { upload?: UploadOptions },
  ): Promise<AxiosResponse<UploadResponse>> {
    this.uploadOptions = options?.upload;
    return this.runUpload(dataStream, { ...options });
  }

  async runUpload(
    dataStream: Readable | Buffer,
    transactionOpts?: DataItemCreateOptions & { upload?: UploadOptions },
  ): Promise<AxiosResponse<UploadResponse>> {
    let id = this.uploadID;

    const isTransaction = transactionOpts === undefined;

    const headers = { "x-chunking-version": "2" };

    let getres;
    if (!id) {
      getres = await this.api.get(`/chunks/${this.token}/-1/-1`, { headers });
      Utils.checkAndThrow(getres, "Getting upload token");
      this.uploadID = id = getres.data.id;
    } else {
      getres = await this.api.get(`/chunks/${this.token}/${id}/-1`, { headers });
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
    const promiseFactory = (d: Buffer, o: number, c: number): Promise<{ o: number; d: AxiosResponse<UploadResponse> }> => {
      return new Promise((r) => {
        retry(async (bail) => {
          await this.api
            .post(`/chunks/${this.token}/${id}/${o}`, d, {
              headers: { "Content-Type": "application/octet-stream", ...headers },
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            })
            .then((re) => {
              if (re?.status >= 300) {
                const e = { res: re, id: c, offset: o, size: d.length };
                this.emit("chunkError", e);
                if (re?.status === 402) {
                  const retryAfterHeader = finishUpload?.headers?.["retry-after"];
                  const errorMsg = "402 error: " + finishUpload.data + (retryAfterHeader ? ` - retry after ${retryAfterHeader}s` : "");
                  bail(new Error(errorMsg));
                }
                throw e;
              }
              this.emit("chunkUpload", { id: c, offset: o, size: d.length, totalUploaded: (totalUploaded += d.length) });
              r({ o, d: re });
            });
        }),
          { retries: 3, minTimeout: 1000, maxTimeout: 10_000 };
      });
    };
    const present = getres.data.chunks ?? ([] as [string, number][]);

    const stream = new PassThrough();

    let cache = Buffer.alloc(0);
    let ended = false;
    let hasData = true;
    stream.on("end", () => (ended = true));
    stream.on("error", (e) => {
      throw new Error(`Error processing readable: ${e}`);
    });

    // custom as we need to read any number of bytes.
    const readBytes = async (size: number): Promise<Buffer> => {
      while (!ended) {
        if (cache.length >= size) {
          data = Buffer.from(cache.slice(0, size)); // force a copy
          cache = cache.slice(size);
          return data;
        }
        // eslint-disable-next-line no-var
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
        data = Buffer.from(cache.slice(0, size)); // force a copy
        cache = cache.slice(size);
        return data;
      }
      hasData = false;
      return cache;
    };

    let tx!: DataItem;
    let txHeaderLength!: number;
    // doesn't matter if we randomise ID (anchor) between resumes, as the tx header/signing info is always uploaded last.
    if (!isTransaction) {
      tx = this.arbundles.createData("", this.tokenConfig.getSigner(), {
        ...transactionOpts,
        anchor: transactionOpts?.anchor ?? Crypto.randomBytes(32).toString("base64").slice(0, 32),
      });
      const raw = tx.getRaw();
      txHeaderLength = raw.length;
      stream.write(raw);
      totalUploaded -= raw.length;
    }

    if (Buffer.isBuffer(dataStream)) {
      stream.write(dataStream);
      stream.end();
    } else if ("pipe" in dataStream) {
      dataStream.pipe(stream);
    } else {
      throw new Error("Input data is not a buffer or a compatible stream (no .pipe method)");
    }

    let offset = 0;
    const processing = new Set<Promise<any>>();
    let chunkID = 0;
    let heldChunk!: Buffer;
    let teeStream!: PassThrough;
    let deephash!: Promise<Uint8Array>;

    if (!isTransaction) {
      teeStream = new PassThrough();

      const txLength = tx.getRaw().length;
      if (this.chunkSize < txHeaderLength)
        throw new Error(`Configured chunk size is too small for transaction header! (${this.chunkSize} < ${txHeaderLength})`);
      heldChunk = await readBytes(this.chunkSize);
      chunkID++;
      offset += heldChunk.length;
      teeStream.write(heldChunk.slice(txLength));
      const sigComponents = [
        this.arbundles.stringToBuffer("dataitem"),
        this.arbundles.stringToBuffer("1"),
        this.arbundles.stringToBuffer(tx.signatureType.toString()),
        tx.rawOwner,
        tx.rawTarget,
        tx.rawAnchor,
        tx.rawTags,
        new StreamToAsyncIterator<Buffer>(teeStream),
      ];
      // do *not* await, this needs to process in parallel to the upload process.
      deephash = this.arbundles.deepHash(sigComponents);
    }

    let nextPresent = present.pop();

    // Consume data while there's data to read.
    while (hasData) {
      if (this.paused) {
        await new Promise((r) => this.on("resume", () => r(undefined)));
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

      while (processing.size >= this.batchSize) {
        // get & then remove resolved promise from processing set
        const [p] = await Promise.race(processing);
        processing.delete(p);
      }

      // self-referencing promise
      const promise = (async (): Promise<any> => await promiseFactory(chunk, offset, ++chunkID))().then((value) => [promise, value]);
      processing.add(promise);

      offset += chunk.length;
    }

    if (teeStream) teeStream.end();

    await Promise.all(processing);

    if (!isTransaction) {
      const hash = await deephash;
      const sigBytes = Buffer.from(await this.tokenConfig.getSigner().sign(hash));

      heldChunk.set(sigBytes, 2); // tx will be the first part of the held chunk.

      await promiseFactory(heldChunk, 0, 0);
    }
    const finalHeaders = { "Content-Type": "application/octet-stream", ...headers };
    if (transactionOpts?.upload?.paidBy) finalHeaders[UploadHeaders.PAID_BY] = transactionOpts.upload.paidBy;
    // potential improvement: write chunks into a file at offsets, instead of individual chunks + doing a concatenating copy
    const finishUpload = await this.api.post(`/chunks/${this.token}/${id}/-1`, null, {
      headers: finalHeaders,
      timeout: this.api.config?.timeout ?? 40_000 * 10, // server side reconstruction can take a while
    });

    if (finishUpload.status === 402) {
      const retryAfterHeader = finishUpload?.headers?.["retry-after"];
      const errorMsg = "402 error: " + finishUpload.data + (retryAfterHeader ? ` - retry after ${retryAfterHeader}s` : "");
      throw new Error(errorMsg);
    }
    // this will throw if the dataItem reconstruction fails
    Utils.checkAndThrow(finishUpload, "Finalising upload", [201]);
    // Recover ID
    if (finishUpload.status === 201) {
      throw new Error(finishUpload.data as any as string);
    }

    finishUpload.data.verify = Utils.verifyReceipt.bind({}, this.arbundles, finishUpload.data.data);

    this.emit("done", finishUpload);
    return finishUpload;
  }

  get completionPromise(): Promise<AxiosResponse<UploadResponse>> {
    return new Promise((r) => this.on("done", r));
  }
}
