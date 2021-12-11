import Bundlr from "../src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr("https://node1.bundlr.network", "arweave", JWK);
        console.log(bundler.address);

        let rec = await bundler.uploader.uploadFolder("./testFolder", "index.html")
        console.log(JSON.stringify(rec));

        //const transaction = await bundler.createTransaction("aaa");
        // await transaction.sign();
        // console.log(transaction.id);
        // console.log(`https://node1.bundlr.network/tx/${transaction.id}/data`);
        // console.log(`https://arweave.net/${transaction.id}/data`);
        // await transaction.upload();
        // console.log(transaction.isSigned());
        // console.log(`balance: ${await bundler.getLoadedBalance()}`);
        // const bAddress = await bundler.utils.getBundlerAddress("arweave");
        // console.log(`bundler address: ${bAddress}`);
        // console.log(`bundler balance: ${await bundler.getBalance(bAddress)}`);
        // //console.log(`invalid balance: ${await bundler.getBalance("sadndgfijadijga")}`);
        // let tx = await bundler.fund(1000, 1.2);
        // console.log(tx);
        // console.log(`Funding receipt:\nAmount: ${tx.quantity} with Reward: ${tx.reward} to ${tx.target}\nID: ${tx.id}`)
        // console.log("note: funds can take up to 50 blocks to be detected by the bundler - funding can also fail if the tx is dropped by the network.")
        // let rec = await bundler.uploadFile("a.txt");
        // console.log(JSON.stringify(rec.data));
        // console.log(JSON.stringify(rec.status));
        // let res = await bundler.withdrawBalance(1000);
        // console.log(`withdrawl: ${JSON.stringify(res.data)}`);

        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();