import Bundlr from "./src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr({ wallet: JWK, APIConfig: { host: "node1.bundlr.network" } });
        console.log(bundler.getAddress());
        console.log(`balance: ${await bundler.getBalance()}`);
        console.log(`bundler balance: ${await bundler.utils.getBalance("OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs")}`);
        let res = await bundler.withdrawBalance(1000);
        console.log(`withdrawl: ${res.data}`);
        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();