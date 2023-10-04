import Irys from "../src/cjsIndex";
import { checkPath } from "../src/node/upload";
import { genData } from "./genData";
import { promises, readFileSync } from "fs";
import { checkManifestIrys } from "./checkManifest";

const keys = JSON.parse(readFileSync("wallet.json").toString());

const w = keys.arweave;

(async function () {
  const nodeUrl = "http://node1.bundlr.network";
  const testFolder = `./testFolder/${process.pid}`;
  let irys = new Irys({ url: nodeUrl, currency: "arweave", wallet: w });
  await irys.ready();
  console.log(irys.address);

  await promises.rm(`${testFolder}-manifest.json`, { force: true });
  await promises.rm(`${testFolder}-manifest.csv`, { force: true });
  await promises.rm(`${testFolder}-id.txt`, { force: true });

  if (!(await checkPath(`./${testFolder}`))) {
    await genData(`./${testFolder}`, 10_000, 100, 1_000);
  }

  irys.uploader.useChunking = false;
  const resu = await irys.uploadFolder(`./${testFolder}`, {
    batchSize: 20,
    keepDeleted: false,
    logFunction: async (log): Promise<void> => {
      console.log(log);
    },
  });
  console.log(resu);

  /* const checkResults = */ await checkManifestIrys(`./${testFolder}`, nodeUrl);
})();
