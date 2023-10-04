import Irys from "../src/cjsIndex";
import { readFileSync } from "fs";
import axios from "axios";
import Crypto from "crypto";
import { sleep } from "../src/common/utils";

async function a() {
  try {
    const JWK = JSON.parse(readFileSync("arweave.json").toString());
    const irys = new Irys({ url: "https://node1.bundlr.network", currency: "arweave", wallet: JWK });
    console.log(irys.address);
    for (let i = 0; i < 400; i++) {
      try {
        // await sleep(10_000);
        const transaction = await irys.createTransaction(Crypto.randomBytes(32).toString("base64"));
        await transaction.sign();
        console.log(transaction.id);
        const burl = `https://arweave.net/${transaction.id}/data`;
        const aurl = `https://gateway.bundlr.network/tx/${transaction.id}/data`;
        console.log("uploading");
        await transaction.upload();
        const resb2 = await axios.get(burl, { responseType: "arraybuffer", responseEncoding: "binary" });
        const resa2 = await axios.get(aurl, { responseType: "arraybuffer", responseEncoding: "binary" });
        const result = Buffer.compare(resb2.data, resa2.data);
        console.log(result);
      } catch (e: any) {
        console.log(e);
      }
    }
    console.log("done");
  } catch (e: any) {
    console.log(e);
  }
}
a();
