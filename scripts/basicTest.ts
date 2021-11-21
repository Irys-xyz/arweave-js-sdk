import Bundlr from "../src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr("http://dev1.bundlr.network", "arweave", JWK);
        //let bundler = new Bundlr("http://node1.bundlr.network", "matic");
        console.log(bundler.address);

        console.log(`balance: ${await bundler.getLoadedBalance()}`);
        const bAddress = await bundler.utils.getBundlerAddress("arweave");
        console.log(`bundler address: ${bAddress}`);
        console.log(`bundler balance: ${await bundler.getBalance(bAddress)}`);
        //console.log(`invalid balance: ${await bundler.getBalance("sadndgfijadijga")}`);
        let tx = await bundler.fund(1000, 1.2);
        console.log(tx);
        console.log(`Funding receipt:\nAmount: ${tx.quantity} with Reward: ${tx.reward} to ${tx.target}\nID: ${tx.id}`)
        console.log("note: funds can take up to 50 blocks to be detected by the bundler - funding can also fail if the tx is dropped by the network.")
        let rec = await bundler.uploadFile("a.txt");
        console.log(JSON.stringify(rec.data));
        console.log(JSON.stringify(rec.status));
        let res = await bundler.withdrawBalance(1000);
        console.log(`withdrawl: ${JSON.stringify(res.data)}`);

        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();