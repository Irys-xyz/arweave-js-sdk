import Bundlr from "./src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr({ wallet: JWK, APIConfig: { host: "dev.bundlr.network" }, gatewayConfig: { host: "arweave.net" } });
        console.log(bundler.getAddress());
        console.log(`balance: ${await bundler.getLoadedBalance()}`);
        const bAddress = await bundler.utils.getBundlerAddress();
        console.log(`bundler address: ${bAddress}`);
        console.log(`bundler balance: ${await bundler.getBalance(bAddress)}`);
        let tx = await bundler.fund(1000);
        console.log(tx);
        console.log(`Funding receipt:\nAmount: ${tx.quantity} with Reward: ${tx.reward} to ${tx.target}\nID: ${tx.id}`)
        console.log("note: funds can take up to 50 blocks to be detected by the bundler - funding can also fail if the tx is dropped by the network.")
        let rec = await bundler.upload("a.txt");
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