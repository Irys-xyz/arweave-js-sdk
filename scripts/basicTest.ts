// eslint-disable-file @typescript-eslint/no-unused-vars
import Bundlr from "../src";
import { promises, readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next";
import Crypto from "crypto";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { checkManifestBundlr } from "./checkManifest";
import { AptosAccount, FaucetClient } from "aptos";

const profiling = false;
async function main() {
    const title = new Date().toUTCString();
    try {
        if (profiling) {
            v8.setGenerateType(1); // set profile type
            v8.startProfiling(title, true); // cpu
            v8.startSamplingHeapProfiling(); // heap
            setInterval(() => {
                for (const [key, value] of Object.entries(process.memoryUsage())) {
                    console.log(`Memory usage by ${key}, ${value / 1000000}MB `);
                }
            }, 2000);
            console.log("profiling configured");
        }

        const keys = JSON.parse(readFileSync("wallet.json").toString());

        const nodeUrl = "http://172.17.0.3:10000";
        const testFolder = "testFolder";

        const acc1 = new AptosAccount(Buffer.from("8fd100fc7d849c2d8dcc2963fa2ba735d015643c971a4ad8c37e1472813bcf21", "hex"))
        const acc2 = new AptosAccount(Buffer.from("e441319e1bd7fcd247739e70346d8939b171081a7411736c853d4263e8c1906b", "hex"))
        const acc3 = new AptosAccount(Buffer.from("0cab9823aecae4c8674f9319c80abc664c65d0e5d0c33a9c2add70fd23908a26", "hex"))

        const participants = [acc1, acc2, acc3].map(a => a.signingKey.publicKey)
        const threshold = 2; // the minimum number of account signatures required.

        const getSigs = async (message: Uint8Array) => {
            const signatures = [acc1, acc3].map(a => Buffer.from(a.signBuffer(message).toString().slice(2), "hex"))
            return { signatures: signatures, bitmap: [0, 2] }
        }

        const fc = new FaucetClient("https://fullnode.devnet.aptoslabs.com", "https://faucet.devnet.aptoslabs.com")


        let bundlr = new Bundlr(nodeUrl, "multiAptos", { participants: participants, threshold: threshold }, { currencyOpts: { collectSignatures: getSigs } });
        await bundlr.ready()
        console.log(bundlr.address); //0xa140c48fe5b0bcad4dd1a21b5d56c0b8fbda18128b0b10ca82d018cc19cc488f

        let res;
        let tx;

        // res = await fc.fundAccount(bundlr.address, 100_000)
        // console.log(res)

        console.log(`balance: ${await bundlr.getLoadedBalance()}`);
        const bAddress = await bundlr.utils.getBundlerAddress(bundlr.currency);
        console.log(`bundlr address: ${bAddress}`);


        // let tx = await bundlr.fund(10_000, 1);
        // console.log(tx);
        // console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        const transaction = await bundlr.createTransaction("aaa");
        await transaction.sign();
        console.log(transaction.id);
        console.log(await transaction.isValid());
        res = await transaction.upload();
        console.log(`Upload: ${JSON.stringify(res.data)}`);

        const ctx = bundlr.createTransaction(Crypto.randomBytes(15_000_000).toString("base64"));
        await ctx.sign();
        console.log(ctx.isSigned());

        const uploader = bundlr.uploader.chunkedUploader;
        uploader.on("chunkUpload", (chunkInfo) => {
            console.log(chunkInfo);
        });
        res = uploader.setChunkSize(600_000).setBatchSize(1).uploadTransaction(ctx);

        await new Promise(r => uploader.on("chunkUpload", r));
        uploader.pause();
        const uploadInfo = uploader.getResumeData();
        const uploader2 = bundlr.uploader.chunkedUploader;

        uploader2.on("chunkError", (e) => {
            console.error(`Error uploading chunk number ${e.id} - ${e.res.statusText}`);
        });
        uploader2.on("chunkUpload", (chunkInfo) => {
            console.log(`Uploaded Chunk with ID ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded}`);
        });

        res = await uploader2.setResumeData(uploadInfo).setChunkSize(600_000).uploadTransaction(ctx);
        console.log(res);

        await promises.rm(`${testFolder}-manifest.json`, { force: true });
        await promises.rm(`${testFolder}-manifest.csv`, { force: true });
        await promises.rm(`${testFolder}-id.txt`, { force: true });


        if (!await checkPath(`./${testFolder}`)) {
            await genData(`./${testFolder}`, 1_000, 100, 100_000);
        }

        const resu = await bundlr.uploader.uploadFolder(`./${testFolder}`, undefined, 10, false, true, async (log): Promise<void> => { console.log(log); });
        console.log(resu);

        /* const checkResults = */ await checkManifestBundlr(`./${testFolder}`, nodeUrl);
        /*         console.log(checkResults); */

        res = await bundlr.uploadFile(`./${testFolder}/0.json`);
        console.log(JSON.stringify(res.data));
        console.log(JSON.stringify(res.status));

        console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        tx = await bundlr.fund(1, 1);
        console.log(tx);
        console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        let resw = await bundlr.withdrawBalance(1);
        console.log(`withdrawal: ${JSON.stringify(resw.data)}`);
        console.log(`balance: ${await bundlr.getLoadedBalance()}`);


    } catch (e) {
        console.log(e);
    } finally {
        console.log("Done!");

        if (!profiling) return;

        const cpuprofile = v8.stopProfiling(title);
        cpuprofile.export((_err, res) => {
            writeFileSync(`./profiles/cpu/${title}.cpuprofile`, res ?? "");
        });
        cpuprofile.delete();
        const heapProfile = v8.stopSamplingHeapProfiling();
        heapProfile.export((_err, res) => {
            writeFileSync(`./profiles/heap/${title}.heapprofile`, res ?? "");
        });
    }
}

if (require.main === module) {
    const trap = (con, err) => {
        console.error(`Trapped error ${con}: ${JSON.stringify(err)}`);
    };
    // process.on("beforeExit", trap.bind(this, "beforeExit"))
    // process.on("exit", trap.bind(this, "exit"))
    process.on("uncaughtException", trap.bind(this, "uncaughtException"));
    process.on("unhandledRejection", trap.bind(this, "unhandledRejection"));
    main();
}
