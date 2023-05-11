// eslint-disable-file @typescript-eslint/no-unused-vars
import Bundlr from "../src/cjsIndex";
import { promises, readFileSync } from "fs";
import Crypto from "crypto";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { checkManifestBundlr } from "./checkManifest";

const profiling = true;
async function main() {
  try {
    if (profiling) console.profile();
    const keys = JSON.parse(readFileSync("wallet.json").toString());

    const nodeUrl = "http://devnet.bundlr.network";
    const testFolder = "testFolder";

    const { key, providerUrl } = keys.testnet.ethereum;

    // let bundlr = await Bundlr.init({ url: nodeUrl, currency: "aptos", publicKey: account.pubKey().toString(), signingFunction });
    // let bundlr = Bundlr.init({ url: nodeUrl, currency: "aptos", privateKey: key })

    const bundlr = new Bundlr(nodeUrl, "ethereum", key, { providerUrl });
    await bundlr.ready();
    console.log(bundlr.address);

    let res;
    let tx;

    console.log(`balance: ${await bundlr.getLoadedBalance()}`);
    const bAddress = await bundlr.utils.getBundlerAddress(bundlr.currency);
    console.log(`bundlr address: ${bAddress}`);

    tx = bundlr.createTransaction("Hello, world!", { tags: [{ name: "Content-type", value: "text/plain" }] });
    await tx.sign();
    console.log(await tx.isValid());

    tx = bundlr.transaction.fromRaw(tx.getRaw());

    const now = performance.now();
    res = await tx.upload({ getReceiptSignature: true });
    // tx = bundlr;
    // res = await bundlr.upload("Hello, world!", { upload: { getReceiptSignature: true } });
    console.log(performance.now() - now);
    const r3 = await res.verify();

    console.log(r3);
    console.log(res);

    const transaction = bundlr.createTransaction("Hello, world!", { tags: [{ name: "Content-type", value: "text/plain" }] });
    await transaction.sign();
    res = await transaction.upload({ getReceiptSignature: false });

    const signingInfo = await transaction.getSignatureData();
    const signed = await bundlr.currencyConfig.sign(signingInfo);
    transaction.setSignature(Buffer.from(signed));

    console.log(transaction.id);
    console.log(await transaction.isValid());

    res = await transaction.upload();
    console.log(`Upload: ${JSON.stringify(res)}`);

    const ctx = bundlr.createTransaction(Crypto.randomBytes(15_000_000).toString("base64"));
    await ctx.sign();
    console.log(ctx.isSigned());

    const uploader = bundlr.uploader.chunkedUploader;
    uploader.on("chunkUpload", (chunkInfo) => {
      console.log(chunkInfo);
    });
    res = uploader.setChunkSize(600_000).setBatchSize(2).uploadTransaction(ctx, { getReceiptSignature: false });

    await new Promise((r) => uploader.on("chunkUpload", r));
    uploader.pause();
    const uploadInfo = uploader.getResumeData();
    const uploader2 = bundlr.uploader.chunkedUploader;

    uploader2.on("chunkError", (e) => {
      console.error(`Error uploading chunk number ${e.id} - ${e.res.statusText}`);
    });
    uploader2.on("chunkUpload", (chunkInfo) => {
      console.log(
        `Uploaded Chunk with ID ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded}`,
      );
    });

    res = await uploader2.setResumeData(uploadInfo).setChunkSize(600_000).uploadTransaction(ctx);
    console.log(res);

    await promises.rm(`${testFolder}-manifest.json`, { force: true });
    await promises.rm(`${testFolder}-manifest.csv`, { force: true });
    await promises.rm(`${testFolder}-id.txt`, { force: true });

    if (!(await checkPath(`./${testFolder}`))) {
      await genData(`./${testFolder}`, 1_000, 100, 10_000);
    }

    const resu = await bundlr.uploadFolder(`./${testFolder}`, {
      batchSize: 20,
      keepDeleted: false,
      logFunction: async (log): Promise<void> => {
        console.log(log);
      },
    });
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
    if (profiling) console.profileEnd();
    console.log("Done!");
  }
}

if (require.main === module) {
  const trap = (con, err) => {
    if (profiling) console.profileEnd();
    console.error(`Trapped error ${con}: ${JSON.stringify(err)}`);
  };
  // process.on("beforeExit", trap.bind(this, "beforeExit"))
  // process.on("exit", trap.bind(this, "exit"))
  process.on("uncaughtException", trap.bind(this, "uncaughtException"));
  process.on("unhandledRejection", trap.bind(this, "unhandledRejection"));
  main();
}
