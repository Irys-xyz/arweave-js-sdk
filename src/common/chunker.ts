import internal, { Transform } from "stream";


export default class SizeChunker extends Transform {
    protected bytesPassed = 0
    protected currentChunk = 0
    protected chunkSize;
    protected flushTail;
    protected cache = Buffer.alloc(0)

    constructor(options: internal.TransformOptions & { chunkSize: number, flushTail: boolean }) {
        super({ ...options, readableObjectMode: true });
        this.chunkSize = options.chunkSize ?? 10_000
        this.flushTail = options.flushTail ?? true

    }

    _transform(chunk: any, _encoding: BufferEncoding, done: internal.TransformCallback): void {
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