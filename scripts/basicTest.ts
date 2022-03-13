// eslint-disable-file @typescript-eslint/no-unused-vars
import Bundlr from "../src";
import { readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next"
import Crypto from "crypto"


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

        const tx = bundlr.createTransaction(Crypto.randomBytes(150_000_000).toString("base64"))
        await tx.sign()
        bundlr.uploader.useChunking = true
        const res = await tx.upload()
        console.log(res)

        const res2 = await tx.upload();
        console.log(res2)
        bundlr.uploader.useChunking = false

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
