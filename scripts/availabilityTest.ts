import Bundlr from "../src/index";
import { readFileSync } from 'fs';
import axios from "axios";
import Crypto from "crypto"

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr("https://node1.bundlr.network", "arweave", JWK);
        await bundler.ready();
        console.log(bundler.address);
        for (let i = 0; i < 4; i++) {
            const transaction = await bundler.createTransaction(Crypto.randomBytes(32).toString("base64"));
            await transaction.sign();
            console.log(transaction.id);
            const burl = `https://node1.bundlr.network/tx/${transaction.id}/data`
            const aurl = `https://arweave.net/${transaction.id}/data`
            // let resb = await axios.get(burl);
            // let resa = await axios.get(aurl);
            // console.log(resb.status)
            // console.log(resa.status)
            console.log("uploading")
            await transaction.upload();
            console.log(burl);
            console.log(aurl);
            const resb2 = await axios.get(burl);
            const resa2 = await axios.get(aurl);
            console.log(resb2.status)
            console.log(resa2.status)
        }
        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();