import BigNumber from "bignumber.js";
import { Bundlr } from "../src";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundlr = new Bundlr("https://dev1.bundlr.network", "arweave", JWK);
        console.log(bundlr.address);
        console.log(`balance: ${await bundlr.getLoadedBalance()}`);
        const resu = await bundlr.uploader.uploadFolder("./testFolder")
        console.log(resu);
        const transaction = await bundlr.createTransaction("aaa");
        await transaction.sign();
        const res = await transaction.upload();
        console.log(`Upload: ${JSON.stringify(res.data)}`);
        const bAddress = await bundlr.utils.getBundlerAddress("arweave");
        console.log(`bundlr address: ${bAddress}`);
        let tx = await bundlr.fund(new BigNumber("1000"), 1);
        console.log(tx);
        let rec = await bundlr.uploadFile("a.txt");
        console.log(JSON.stringify(rec.data));
        console.log(JSON.stringify(rec.status));
        let resw = await bundlr.withdrawBalance(new BigNumber(1000));
        console.log(`withdrawl: ${JSON.stringify(resw.data)}`);

        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();