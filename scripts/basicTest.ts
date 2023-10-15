// eslint-disable-file @typescript-eslint/no-unused-vars
import Irys from "../src/cjsIndex";
import { promises, readFileSync } from "fs";
import Crypto from "crypto";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { checkManifestIrys } from "./checkManifest";

const profiling = true;
async function main() {
  try {
    if (profiling) console.profile();
    const keys = JSON.parse(readFileSync("wallet.json").toString());

    const nodeUrl = "http://devnet.irys.xyz";
    const testFolder = "testFolder";

    const { key, providerUrl } = keys.testnet.ethereum;

    // let irys = await irys.init({ url: nodeUrl, currency: "aptos", publicKey: account.pubKey().toString(), signingFunction });
    // let irys = irys.init({ url: nodeUrl, currency: "aptos", privateKey: key })

    const irys = new Irys({ url: nodeUrl, token: "ethereum", key: key, config: { providerUrl } });
    await irys.ready();
    console.log(irys.address);

    let res;
    let tx;

    console.log(`balance: ${await irys.getLoadedBalance()}`);
    const bAddress = await irys.utils.getBundlerAddress(irys.token);
    console.log(`irys address: ${bAddress}`);

    tx = irys.createTransaction("Hello, world!", { tags: [{ name: "Content-type", value: "text/plain" }] });
    await tx.sign();
    console.log(await tx.isValid());

    tx = irys.transaction.fromRaw(tx.getRaw());

    const now = performance.now();
    res = await tx.upload({ getReceiptSignature: true });
    // tx = irys;
    // res = await irys.upload("Hello, world!", { upload: { getReceiptSignature: true } });
    console.log(performance.now() - now);
    const r3 = await res.verify();

    console.log(r3);
    console.log(res);

    const transaction = irys.createTransaction("Hello, world!", { tags: [{ name: "Content-type", value: "text/plain" }] });
    await transaction.sign();
    res = await transaction.upload({ getReceiptSignature: false });

    const signingInfo = await transaction.getSignatureData();
    const signed = await irys.tokenConfig.sign(signingInfo);
    transaction.setSignature(Buffer.from(signed));

    console.log(transaction.id);
    console.log(await transaction.isValid());

    res = await transaction.upload();
    console.log(`Upload: ${JSON.stringify(res)}`);

    const ctx = irys.createTransaction(Crypto.randomBytes(15_000_000).toString("base64"));
    await ctx.sign();
    console.log(ctx.isSigned());

    const uploader = irys.uploader.chunkedUploader;
    uploader.on("chunkUpload", (chunkInfo) => {
      console.log(chunkInfo);
    });
    res = uploader.setChunkSize(600_000).setBatchSize(2).uploadTransaction(ctx, { getReceiptSignature: false });

    await new Promise((r) => uploader.on("chunkUpload", r));
    uploader.pause();
    const uploadInfo = uploader.getResumeData();
    const uploader2 = irys.uploader.chunkedUploader;

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

    const resu = await irys.uploadFolder(`./${testFolder}`, {
      batchSize: 20,
      keepDeleted: false,
      logFunction: async (log): Promise<void> => {
        console.log(log);
      },
    });
    console.log(resu);

    /* const checkResults = */ await checkManifestIrys(`./${testFolder}`, nodeUrl);

    res = await irys.uploadFile(`./${testFolder}/0.json`);
    console.log(JSON.stringify(res));

    console.log(`balance: ${await irys.getLoadedBalance()}`);

    tx = await irys.fund(1, 1);
    console.log(tx);
    console.log(`balance: ${await irys.getLoadedBalance()}`);

    let resw = await irys.withdrawBalance(1);
    console.log(`withdrawal: ${JSON.stringify(resw)}`);
    console.log(`balance: ${await irys.getLoadedBalance()}`);
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
