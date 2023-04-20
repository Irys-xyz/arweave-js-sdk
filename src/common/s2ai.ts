import type { Readable } from "stream";

const NOT_READABLE: unique symbol = Symbol("not readable");
const READABLE: unique symbol = Symbol("readable");
const ENDED: unique symbol = Symbol("ended");
const ERRORED: unique symbol = Symbol("errored");
export const STATES = {
  notReadable: NOT_READABLE,
  readable: READABLE,
  ended: ENDED,
  errored: ERRORED,
} as const;
type States = (typeof STATES)[keyof typeof STATES];

/*
 * A contract for a promise that requires a clean up
 * function be called after the promise finishes.
 */
interface ClosablePromise<T> {
  promise: Promise<T>;
  close: () => void;
}

export interface StreamToAsyncIteratorOptions {
  /** The size of each read from the stream for each iteration */
  size?: number;
}

/**
 * Wraps a stream into an object that can be used as an async iterator.
 *
 * This will keep a stream in a paused state, and will only read from the stream on each
 * iteration. A size can be supplied to set an explicit call to `stream.read([size])` in
 * the options for each iteration.
 */
export default class StreamToAsyncIterator<T = unknown> implements AsyncIterableIterator<T> {
  /** The underlying readable stream */
  private _stream: Readable;
  /** Contains stream's error when stream has error'ed out */
  private _error: Error | undefined;
  /** The current state of the iterator (not readable, readable, ended, errored) */
  private _state: States = STATES.notReadable;
  private _size: number | undefined;
  /** The rejections of promises to call when stream errors out */
  private _rejections = new Set<(err: Error) => void>();
  get closed(): boolean {
    return this._state === STATES.ended;
  }

  constructor(stream: Readable, { size }: StreamToAsyncIteratorOptions = {}) {
    this._stream = stream;
    this._size = size;

    const bindMethods = ["_handleStreamEnd", "_handleStreamError"] as const;
    for (const method of bindMethods) {
      Object.defineProperty(this, method, {
        configurable: true,
        writable: true,
        value: this[method].bind(this),
      });
    }

    // eslint-disable-next-line @typescript-eslint/unbound-method
    stream.once("error", this._handleStreamError);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    stream.once("end", this._handleStreamEnd);
    stream.on("readable", () => {
      this._state = STATES.readable;
    });
  }

  [Symbol.asyncIterator](): this {
    return this;
  }

  /**
   * Returns the next iteration of data. Rejects if the stream errored out.
   */
  async next(): Promise<IteratorResult<T, void>> {
    switch (this._state) {
      case STATES.notReadable: {
        let untilReadable;
        let untilEnd;
        try {
          untilReadable = this._untilReadable();
          untilEnd = this._untilEnd();
          await Promise.race([untilReadable.promise, untilEnd.promise]);
        } finally {
          // need to clean up any hanging event listeners
          if (untilReadable != null) {
            untilReadable.close();
          }
          if (untilEnd != null) {
            untilEnd.close();
          }
        }
        return this.next();
      }
      case STATES.ended: {
        this.close();
        return { done: true, value: undefined };
      }
      case STATES.errored: {
        this.close();
        throw this._error;
      }
      case STATES.readable: {
        // stream.read returns null if not readable or when stream has ended
        // todo: Could add a way to ensure data-type/shape of reads to make this type safe
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: T = this._size ? this._stream.read(this._size) : this._stream.read();

        if (data !== null) {
          return { done: false, value: data };
        } else {
          // we're no longer readable, need to find out what state we're in
          this._state = STATES.notReadable;
          // need to let event loop run to fill stream buffer
          await new Promise((r) => setTimeout((r) => r(true), 0, r));
          return this.next();
        }
      }
    }
  }

  /**
   * Waits until the stream is readable. Rejects if the stream errored out.
   * @returns Promise when stream is readable
   */
  private _untilReadable(): ClosablePromise<void> {
    // let is used here instead of const because the exact reference is
    // required to remove it, this is why it is not a curried function that
    // accepts resolve & reject as parameters.
    let handleReadable: (() => void) | undefined = undefined;

    const promise = new Promise<void>((resolve, reject) => {
      handleReadable = (): void => {
        this._state = STATES.readable;
        this._rejections.delete(reject);
        resolve();
      };
      if (this._state === STATES.readable) handleReadable; // race condition guard
      this._stream.once("readable", handleReadable);
      this._rejections.add(reject);
    });

    const cleanup = (): void => {
      if (handleReadable != null) {
        this._stream.removeListener("readable", handleReadable);
      }
    };

    return { close: cleanup, promise };
  }

  /**
   * Waits until the stream is ended. Rejects if the stream errored out.
   * @returns Promise when stream is finished
   */
  private _untilEnd(): ClosablePromise<void> {
    let handleEnd: (() => void) | undefined = undefined;

    const promise = new Promise<void>((resolve, reject) => {
      handleEnd = (): void => {
        this._state = STATES.ended;
        this._rejections.delete(reject);
        resolve();
      };

      this._stream.once("end", handleEnd);
      this._rejections.add(reject);
    });

    const cleanup = (): void => {
      if (handleEnd != null) {
        this._stream.removeListener("end", handleEnd);
      }
    };

    return { close: cleanup, promise };
  }

  return(): Promise<IteratorResult<T, void>> {
    this._state = STATES.ended;
    return this.next();
  }

  throw(err?: Error): Promise<IteratorResult<T, void>> {
    this._error = err;
    this._state = STATES.errored;
    return this.next();
  }

  /**
   * Destroy the stream
   * @param err An optional error to pass to the stream for an error event
   */
  close(err?: Error): void {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this._stream.removeListener("end", this._handleStreamEnd);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this._stream.removeListener("error", this._handleStreamError);

    this._state = STATES.ended;
    this._stream.destroy(err);
  }

  private _handleStreamError(err: Error): void {
    this._error = err;
    this._state = STATES.errored;
    for (const reject of this._rejections) {
      reject(err);
    }
  }

  private _handleStreamEnd(): void {
    this._state = STATES.ended;
  }

  public get state(): States {
    return this._state;
  }
}

// export const addAsyncIterator = (body: ReadableStream) => {
//   const bodyWithIter = body as ReadableStream<Uint8Array> & AsyncIterable<Uint8Array>;
//   if (typeof bodyWithIter[Symbol.asyncIterator] === "undefined") {
//     bodyWithIter[Symbol.asyncIterator] = webIiterator<Uint8Array>(body);
//     return bodyWithIter;
//   }
//   return body;
// };

// export const webIiterator = function <T>(stream: ReadableStream) {
//   return async function* iteratorGenerator<T>() {
//     const reader = stream.getReader(); //lock
//     try {
//       const { done, value } = await reader.read();
//       if (done) return;
//       yield value as T;
//     } finally {
//       reader.releaseLock(); //unlock
//     }
//   };
// };
