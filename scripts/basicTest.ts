import Bundlr from "../src/index";
//import { readFileSync } from 'fs';

async function a() {
    try {
        //const JWK = JSON.parse(readFileSync("wallet.json").toString());
        //let bundler = new Bundlr("https://dev1.bundlr.network", "arweave", JWK);
        let bundler = new Bundlr("http://dev1.bundlr.network", "matic", "29c17feb590ef5471d4f1d203e3525cbcb3073ccbdc593cd39a9cfff2415eeb0");
        console.log(bundler.address);
        console.log(`balance: ${await bundler.getLoadedBalance()}`);
        const transaction = await bundler.createTransaction("aaa");
        await transaction.sign();
        const res = await transaction.upload();
        console.log(`Upload: ${JSON.stringify(res.data)}`);
        const bAddress = await bundler.utils.getBundlerAddress("arweave");
        console.log(`bundler address: ${bAddress}`);
        let tx = await bundler.fund(1000, 1.2);
        console.log(tx);
        let rec = await bundler.uploadFile("a.txt");
        console.log(JSON.stringify(rec.data));
        console.log(JSON.stringify(rec.status));
        let resw = await bundler.withdrawBalance(1000);
        console.log(`withdrawl: ${JSON.stringify(resw.data)}`);

        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();