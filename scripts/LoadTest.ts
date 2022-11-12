import Bundlr from "../src";
import { readFileSync } from "fs";
import { performance } from "perf_hooks"
//const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
import Crypto from "crypto"

// this is a test script to see how many parallell upload operations a node can handle 
// DO NOT USE THIS ON A NODE YOU DO NOT OWN/OPERATE. EVER.
export async function slam(host: string, count = 4000, min = 1_000, max = 10_000) {
    let p = []
    const bundler = new Bundlr(host, "arweave", JSON.parse(readFileSync("./arweave.json").toString()))

    const start = performance.now();
    for (let i = 0; i < count; i++) {
        let data = genRandomData(min, max)
        p.push(
            new Promise((r, rej) => {
                const now = performance.now()
                bundler.uploader.upload(data).then(res => {
                    r({ "start": now, "end": performance.now(), ...res })
                })
                    .catch(e => {
                        rej({ "start": now, "end": performance.now(), ...e })
                    })
            })
        )
    }
    const ress = await Promise.allSettled(p)
    const end = performance.now()
    const total = end - start
    console.log(`total time taken: ${total}`)
    const failed = ress.filter((v: any) => {
        return v.value?.status !== 200
    })
    console.log(`${failed.length} requests failed!`);
    const steps = Math.ceil(end / 1000)
    let a = [];
    let b = [];

    for (let i = 0; i < (steps * 1000); i += 1000) {
        a.push(ress.filter((v: any) => {
            return (v.value.status == 200) && (v.value.end < (i + 1000)) && (v.value.end >= i)
        }))
        b.push(ress.filter((v: any) => {
            return (v.value.status == 200) && (v.value.start < (i + 1000)) && (v.value.start >= i)
        }))
        console.log(`${b[i / 1000].length} requests started in interval ${i} - ${i + 1000}`)
        console.log(`${a[i / 1000].length} requests finished in interval ${i} - ${i + 1000}`)
    }
    console.log(`tps: ${1000 / (total / ress.length)}`)
}


function genRandomData(minSize, maxSize): Buffer {
    let b = Buffer.alloc(0)
    let bytes = randomNumber(minSize, maxSize);
    const chunkSize = 25_000_000
    while (bytes > 0) {
        let toWrite = chunkSize
        if (bytes >= chunkSize) {
            bytes -= chunkSize;
        } else {
            toWrite = bytes
            bytes = 0;
        }
        b = Buffer.concat([b, Crypto.randomBytes(toWrite)])
    }
    return b;
}

function randomNumber(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// eqv of pythons __name__ == __main__ thing
if (require.main === module) {
    const argF = (i) => { return process.argv.length - 1 >= i ? process.argv[i] : undefined }
    slam(argF(2), +(argF(3) ?? 4000), +(argF(4) ?? 1_000), +(argF(5) ?? 10_000))
}


