import Bundlr from "../src";
import { readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next"
const profiling = false;
async function a() {
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
        let bundlr = new Bundlr("https://dev1.bundlr.network", "arweave", keys.arweave)
        console.log(bundlr.address);

        console.log(`balance: ${await bundlr.getLoadedBalance()}`);
        const bAddress = await bundlr.utils.getBundlerAddress(bundlr.currency);
        console.log(`bundlr address: ${bAddress}`);

        const transaction = await bundlr.createTransaction("aaa");
        await transaction.sign();
        console.log(transaction.id)
        const res = await transaction.upload();
        console.log(`Upload: ${JSON.stringify(res.data)}`);

        let rec = await bundlr.uploadFile("a.txt");
        console.log(JSON.stringify(rec.data));
        console.log(JSON.stringify(rec.status));

        const resu = await bundlr.uploader.uploadFolder("./testFolder", null, 50, false, console.log)
        console.log(resu);

        let tx = await bundlr.fund(1337, 1);
        console.log(tx);

        let resw = await bundlr.withdrawBalance(1000);
        console.log(`withdrawal: ${JSON.stringify(resw.data)}`);


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
a();