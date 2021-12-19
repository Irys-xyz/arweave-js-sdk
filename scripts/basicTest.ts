import BigNumber from "bignumber.js";
import { Bundlr } from "../build";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr("https://dev1.bundlr.network", "arweave", JWK);
        console.log(bundler.address);
        console.log(`balance: ${await bundler.getLoadedBalance()}`);
        const transaction = await bundler.createTransaction("aaa");
        await transaction.sign();
        const res = await transaction.upload();
        console.log(`Upload: ${JSON.stringify(res.data)}`);
        const bAddress = await bundler.utils.getBundlerAddress("arweave");
        console.log(`bundler address: ${bAddress}`);
        let tx = await bundler.fund(new BigNumber("1000"), 1);
        console.log(tx);
        let rec = await bundler.uploadFile("a.txt");
        console.log(JSON.stringify(rec.data));
        console.log(JSON.stringify(rec.status));
        let resw = await bundler.withdrawBalance(new BigNumber(1000));
        console.log(`withdrawl: ${JSON.stringify(resw.data)}`);

        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();