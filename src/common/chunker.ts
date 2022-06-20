import internal, { Transform } from "stream";

/**
 * SizeChunker - ingests binary data, up until the chunkSize threshold is matched or exceeded,
 * then it emits a chunk of chunkSize bytes - keeping excess data for subsequent emissions
 * Optionally emits whatever is left in the buffer once the stream closes.
 */
export default class SizeChunker extends Transform {
    protected bytesPassed = 0
    protected currentChunk = 0
    protected chunkSize: number;
    protected flushTail: boolean;
    protected cache = Buffer.alloc(0)

    constructor(options: internal.TransformOptions & { chunkSize: number, flushTail: boolean }) {
        super({ ...options, readableObjectMode: true });
        this.chunkSize = options.chunkSize ?? 10_000
        this.flushTail = options.flushTail ?? true

    }

    _transform(chunk: Buffer, _encoding: BufferEncoding, done: internal.TransformCallback): void {
        this.cache = Buffer.concat([this.cache, chunk])
        while (this.cache.length >= this.chunkSize) {
            this.push({ id: ++this.currentChunk, data: this.cache.slice(0, this.chunkSize), bytesPassed: this.bytesPassed += this.chunkSize })
            this.cache = this.cache.slice(this.chunkSize)
        }
        done()
    }

    _flush(callback: internal.TransformCallback): void {
        if (this.flushTail && this.cache.length > 0) {
            this.bytesPassed += this.cache.length;
            this.push({ id: ++this.currentChunk, data: this.cache, bytesPassed: this.bytesPassed })
        }
        callback()
    }
}