import Bundlr from "../src/node/bundlr";
import { readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next"
// import BundlrTransaction from "../src/common/transaction";
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
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        console.log(JWK.n.length)
        let bundlr = new Bundlr("http://localhost:10001", "polkadot", "0xa5d66c25f16186df713dbbc11428123f4571732f0aabc73d6f2384484ee380a3", {providerUrl:"wss://westend-rpc.polkadot.io" })
        await bundlr.ready();
        console.log(bundlr.address);
        // console.log(await bundlr.currencyConfig.getTx("0x8f5fad27db84eec838e596ed3cbe4fb8e22062ccb71ee7ffa795f5e93435a5c6:0x8d43b639a4cd49aab2a4d9b1e95d8d68d491320470eb62952a7a5d19ca88ba95"))
        // console.log(`balance: ${await bundlr.getLoadedBalance()}`);
        const bAddress = await bundlr.utils.getBundlerAddress(bundlr.currency);
        console.log(`bundlr address: ${bAddress}`);

        // const transaction = await bundlr.createTransaction("aaa");
        // await transaction.sign();
        // // console.log(bundlr.currencyConfig.ownerToAddress(transaction.rawOwner));
        // // console.log(transaction.id)
        // const res = await transaction.upload();
        // console.log(`Upload: ${JSON.stringify(res.data)}`);

        // let rec = await bundlr.uploadFile("a.txt");
        // console.log(JSON.stringify(rec.data));
        // console.log(JSON.stringify(rec.status));

        // const resu = await bundlr.uploader.uploadFolder("./testFolder", null, 50, false, console.log)
        // console.log(resu);

        let tx = await bundlr.fund(100000000000, 1);
        console.log(tx);

        // let resw = await bundlr.withdrawBalance(1000);
        // console.log(`withdrawal: ${JSON.stringify(resw.data)}`);


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