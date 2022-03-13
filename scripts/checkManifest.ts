import * as p from "path";
import { promises } from "fs";
import PromisePool from "@supercharge/promise-pool/dist";
import Axios from "axios";
import assert from "assert"

async function main(path) {
    path = p.resolve(path)
    const basePath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-`)
    const manifestID = (await promises.readFile(`${basePath}id.txt`)).toString()
    console.log(`validating manifest with ID ${manifestID}`);
    const files = []
    for await (const f of walk(path)) {
        files.push(f)
    }
    const results = await PromisePool
        .for(files)
        .withConcurrency(200)
        .process(async (ip, i) => {
            if (i % 50 === 0) {
                console.log(`Processed ${i} entries`)
            }
            const f1 = await promises.readFile(ip)
            // const wstream = createWriteStream(p.join(dir, `${i}.${ext}`))
            // const res = await axios.get(url, {
            //     responseType: "stream"
            // }).catch((e) => {
            //     console.log(`getting ${url} - ${e.message}`)
            // })
            // if (!res) { return }
            // await res.data.pipe(wstream) // pipe to file
            // wstream.on('finish', () => {
            //     resolve("done")
            // })
            // wstream.on('error', (e) => {
            //     reject(e)
            // })
            const f2 = await Axios.get(`https://arweave.net/${manifestID}/${p.relative(path, ip)}`)
            // return assert.deepEqual(Buffer.from(f2.data), f1)
            return assert.deepEqual(f2.data, f1.toString())
        })
    console.log(results)
    if (results.errors.length > 0) {
        console.log("Errors detected")
        results.errors.forEach(e => {
            console.log(e.stack ?? e.message ?? JSON.stringify(e))
        })
    }

}


// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function* walk(dir: string) {
    for await (const d of await promises.opendir(dir)) {
        const entry = p.join(dir, d.name);
        if (d.isDirectory()) yield* await walk(entry);
        else if (d.isFile()) yield entry;
    }
}

main("./testFolder")