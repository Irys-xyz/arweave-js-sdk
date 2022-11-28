import Bundlr from "../src";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { promises, readFileSync } from 'fs';
import { checkManifestBundlr } from "./checkManifest";

const keys = JSON.parse(readFileSync("wallet.json").toString());

const w = keys.arweave;

(async function () {
    const nodeUrl = "http://node1.bundlr.network";
    const testFolder = `./testFolder/${process.pid}`;
    let bundlr = new Bundlr(nodeUrl, "arweave", w);
    await bundlr.ready();
    console.log(bundlr.address);

    await promises.rm(`${testFolder}-manifest.json`, { force: true });
    await promises.rm(`${testFolder}-manifest.csv`, { force: true });
    await promises.rm(`${testFolder}-id.txt`, { force: true });


    if (!await checkPath(`./${testFolder}`)) {
        await genData(`./${testFolder}`, 10_000, 100, 1_000);
    }

    bundlr.uploader.useChunking = false;
    const resu = await bundlr.uploadFolder(`./${testFolder}`, { batchSize: 20, keepDeleted: false, logFunction: async (log): Promise<void> => { console.log(log); } });
    console.log(resu);

    /* const checkResults = */ await checkManifestBundlr(`./${testFolder}`, nodeUrl);

})();