// eslint-disable-file @typescript-eslint/no-unused-vars
import Bundlr from "../src";
import { promises, readFileSync, writeFileSync } from 'fs';
import * as v8 from "v8-profiler-next";
import Crypto from "crypto";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { checkManifestBundlr } from "./checkManifest";
import { AptosAccount, FaucetClient } from "aptos";
import BigNumber from "bignumber.js";

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

        const nodeUrl = "http://devnet.bundlr.network";
        const testFolder = "testFolder";

        const key = keys.devnet.aptos.key;

        const account = new AptosAccount(Buffer.from(key.slice(2), "hex"))
        console.log(account.address())

        const signingFunction = async (msg: Uint8Array) => {
            return account.signBuffer(msg).toUint8Array()
        }

        let bundlr = Bundlr.init({ url: nodeUrl, currency: "aptos", publicKey: account.pubKey().toString(), signingFunction })
        // let bundlr = Bundlr.init({ url: nodeUrl, currency: "aptos", privateKey: key })

        //new Bundlr(nodeUrl, "aptos", keys.devnet.aptos.key)
        await bundlr.ready()
        console.log(bundlr.address);
        account.pubKey



        let res;
        let tx;



        console.log(`balance: ${await bundlr.getLoadedBalance()}`);
        const bAddress = await bundlr.utils.getBundlerAddress(bundlr.currency);
        console.log(`bundlr address: ${bAddress}`);


        res = await bundlr.upload("Hello, world!");
        console.log(res);

        const transaction = await bundlr.createTransaction("aaa");
        await transaction.sign();

        tx = await bundlr.fund(1);
        console.log(tx);
        console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        const transaction = bundlr.createTransaction("Hello, world!", { tags: [{ name: "Content-type", value: "text/plain" }] });
        const signingInfo = await transaction.getSignatureData()
        const signed = await bundlr.currencyConfig.sign(signingInfo)
        transaction.setSignature(Buffer.from(signed))

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

        const resu = await bundlr.uploadFolder(`./${testFolder}`, { batchSize: 10, keepDeleted: false, logFunction: async (log): Promise<void> => { console.log(log); } });
        console.log(resu);

        /* const checkResults = */ await checkManifestBundlr(`./${testFolder}`, nodeUrl);

        res = await bundlr.uploadFile(`./${testFolder}/0.json`);
        console.log(JSON.stringify(res));

        console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        tx = await bundlr.fund(1, 1);
        console.log(tx);
        console.log(`balance: ${await bundlr.getLoadedBalance()}`);

        let resw = await bundlr.withdrawBalance(1);
        console.log(`withdrawal: ${JSON.stringify(resw)}`);
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
