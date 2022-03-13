// eslint-disable-file @typescript-eslint/no-unused-vars
import Bundlr from "../src";
import { readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next"

// import *  as tus from "tus-js-client"

// import { createReadStream, createWriteStream, existsSync, mkdirSync, promises, readFileSync, statSync, writeFileSync } from 'fs';
// import * as p from "path"
// import Chunker from "stream-chunker"
// import { Readable } from "stream";

// import { readFile } from "fs/promises";
// import { DataItem } from "arbundles";
// import { FileDataItem } from "arbundles/file";

import Crypto from "crypto"
// import { FileDataItem } from "arbundles/file";
// import base64url from "base64url";
import { Readable } from "stream";




const profiling = false;
async function main() {
    const title = new Date().toUTCString()
    try {
        if (profiling) {
            v8.setGenerateType(1); // set profile type
            v8.startProfiling(title, true); // cpu
            v8.startSamplingHeapProfiling(); // heap
            setInterval(() => {
                for (const [key, value] of Object.entries(process.memoryUsage())) {
                    console.log(`Memory usage by ${key}, ${value / 1000000}MB `)
                }
            }, 2000)
            console.log("profiling configured");
        }


        const keys = JSON.parse(readFileSync("wallet.json").toString());
        let bundlr = new Bundlr("http://dev1.bundlr.network", "ethereum", keys.ethereum, { providerUrl: "https://rinkeby-light.eth.linkpool.io/", timeout: 100_000 })
        console.log(bundlr.address)
        console.log((await bundlr.getLoadedBalance()).toString())
        // for (let i = 0; i < 1000; i++) {
        // 76660
        const tx = bundlr.createTransaction(Crypto.randomBytes(250_000_000).toString("base64"))
        await tx.sign()
        writeFileSync("./dataitem", tx.getRaw())
        // const txId = base64url.encode(await getId("./dataitem", { offset: 0 }))
        //const txjson = await fileToJson("./dataitem")
        //console.log(txjson)
        // const size1 = statSync(`./dataitem`).size
        // //console.log(await tx.isValid())
        // console.log(size1)
        // // bundlr.uploadFile("./a.txt")
        // const rstrm = createReadStream(`./dataitem`)

        // const di = new FileDataItem("./dataitem")
        // const id = base64url.encode(Crypto.createHash("sha256").update(await di.signature()).digest())
        // console.log(id)
        const rstrm = Readable.from(tx.getRaw())
        const length = tx.getRaw().byteLength
        const res = await bundlr.uploader.chunkedDataItemUploader(rstrm, tx.id, length, 10_000_000)
        console.log(res)
        // const b = await tx.upload();
        // console.log(b)

        //}
        //const tx = bundlr.createTransaction(Crypto.randomBytes(400).toString("base64"))
        // await tx.sign()
        // writeFileSync(`./${tx.id}`, tx.getRaw())
        // const didata = await readFile(`./${tx.id}`);
        // const di = new DataItem(didata)
        // console.log(await di.isValid())
        // console.log(di.id)
        // const rstrm2 = createReadStream(`./${tx.id}`)
        // // const CHUNK_SIZE = 5_000_000;
        // const CHUNK_SIZE = 50_000;

        // if (!existsSync("./testFolder")) {
        //     await promises.mkdir("./testFolder")
        // }


        // // const promiseFactory = (d: string | DataItem, txId: string, offset: number): Promise<Record<string, any>> => {
        // //     return new Promise((r, e) => {
        // //         bundlr.api.post(`/chunks/${txId}/${offset}`, d, {
        // //             headers: { "Content-Type": "application/octet-stream", "Transfer-Encoding": "chunked" }
        // //         })
        // //     })
        // // }

        // let offset = 0;
        // let i = 0;
        // const pArr = []
        // const chunkDir = `./testFolder/${tx.id}`
        // if (!existsSync(chunkDir)) {
        //     mkdirSync(chunkDir)
        // }

        // const size = statSync(`./${tx.id}`).size

        // writeFileSync(`./testFolder/${tx.id}/${size}`, "")
        // const getMissing = async (tx: DataItem) => {
        //     const getres = await bundlr.api.get(`/chunks/${bundlr.currency}/${tx.id}/${size}`)
        //     // list of present chunks
        //     const present = getres.data as Array<string>
        //     // const present = [];

        //     console.log(size)
        //     const remainder = size % CHUNK_SIZE;
        //     const chunks = (size - remainder) / CHUNK_SIZE;
        //     console.log(chunks)

        //     const missing = [];
        //     for (let i = 0; i < chunks + 1; i++) {
        //         const s = i * CHUNK_SIZE
        //         if (!present.includes(`${s}`)) {
        //             missing.push(s);
        //         }
        //     }

        //     console.log(missing);
        //     return missing;
        // }

        // const missing = await getMissing(tx)

        // const cstrm = Chunker(CHUNK_SIZE, { flush: true })
        // cstrm.on("data", async (data: Buffer) => {
        //     console.log(`posting chunk ${i++} - ${offset}`)

        //     cstrm.pause(); //ensure counter sync
        //     offset += data.length

        //     if (!missing.includes(offset) && offset != size) { return; } // hmmm

        //     pArr.push(bundlr.api.post(`/chunks/${bundlr.currency}/${tx.id}/${offset - data.length}`, data, {
        //         headers: { "Content-Type": "application/octet-stream" }
        //     }))
        //     // wstrm.write(data)

        //     // const res = await bundlr.api.post(`/chunks/${bundlr.currency}/${tx.id}/${offset - data.length}`, data, {
        //     //     headers: { "Content-Type": "application/octet-stream" },
        //     //     maxBodyLength: Infinity
        //     // })

        //     // console.log(res.status)
        //     writeFileSync(`./testFolder/${tx.id}/${offset - data.length}`, data)
        //     cstrm.resume()

        // })

        // cstrm.on("finish", async () => {

        //     console.log("finish")
        //     await Promise.allSettled(pArr)
        //     await readChunked(tx.id)

        //     // const r2 = await bundlr.api.post(`/chunks/${bundlr.currency}/${tx.id}/-1`, null, {
        //     //     headers: { "Content-Type": "application/octet-stream" }
        //     // })
        //     // console.log(r2)
        // })

        // rstrm2.pipe(cstrm)


        // // read from chunk store

        // async function readChunked(id) {


        //     const path = `./testFolder/${id}`
        //     let files = await promises.readdir(path)
        //     files = files.sort(function (a, b) { return +a - +b }) //js is dumb 

        //     let total = 0;
        //     const stat = await promises.stat(chunkDir);
        //     console.log(`last modified: ${stat.mtimeMs}`);
        //     const missing = []
        //     for (let i = 0; i < files.length - 1; i++) {
        //         const m = (await promises.stat(p.join(chunkDir, files[i])))
        //         if (+files[i + 1] - total === m.size) {
        //             console.log("good")
        //         }
        //         if (total + m.size === +files[i + 1]) {
        //             console.log("good")
        //         } else {
        //             console.log("discontiguation detected")
        //             missing.push(total + m.size)
        //             total += m.size;
        //         }
        //         total += m.size;
        //     }
        //     if (total === +files.at(-1)) {
        //         console.log("good")
        //     } else {
        //         console.log("mismatch")
        //     }

        //     async function* concatStreams(files): AsyncGenerator<Buffer> {
        //         for (const f of files) {
        //             let readable = createReadStream(p.join(path, f));
        //             console.log(f)
        //             for await (const chunk of readable) {
        //                 yield chunk;
        //             }
        //         }
        //     }

        //     const then = performance.now()
        //     const rstrm1 = Readable.from(await concatStreams(files))
        //     const wstrm = createWriteStream("./dataItem")
        //     rstrm1.pipe(wstrm)

        //     rstrm1.on("close", async () => {
        //         console.log("close")
        //         const di = new FileDataItem("./dataItem")
        //         console.log(`reconstruction is valid? ${await di.isValid()}`)
        //         console.log(performance.now() - then)
        //         console.log(await bundlr.api.get(`/chunks/${bundlr.currency}/${tx.id}/${size}`))
        //         const r2 = await bundlr.api.post(`/chunks/${bundlr.currency}/${tx.id}/-1`, null, {
        //             headers: { "Content-Type": "application/octet-stream" },
        //             timeout: 100_000 //100 seconds - reconstruction can take some time.
        //         })
        //         console.log(r2.data)
        //     })

        // }


        // const resu = await bundlr.uploader.uploadFolder("./testFolder", null, 50, false, true, async (log): Promise<void> => { console.log(log) })
        // console.log(resu);

        // console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        // let tx = await bundlr.fund(100, 1);
        // console.log(tx);
        // console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        // let resw = await bundlr.withdrawBalance(100);
        // console.log(`withdrawal: ${JSON.stringify(resw.data)}`);
        // console.log(`balance: ${await bundlr.getLoadedBalance()}`);


    } catch (e) {
        console.log(e);
    } finally {
        if (!profiling) {
            console.log("done!");
            return
        };

        const cpuprofile = v8.stopProfiling(title)
        cpuprofile.export((_err, res) => {
            writeFileSync(`./profiles/cpu/${title}.cpuprofile`, res)
        })
        cpuprofile.delete();
        const heapProfile = v8.stopSamplingHeapProfiling();
        heapProfile.export((_err, res) => {
            writeFileSync(`./profiles/heap/${title}.heapprofile`, res)
        })
    }
}
main();
