import Bundlr from "./src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = await Bundlr.init({ wallet: JWK, APIConfig: { host: "node1.bundlr.network" } });
        console.log(await bundler.getAddress());
        console.log(`balance: ${await bundler.getBalance()}`);
        console.log(`bundler balance: ${await bundler.utils.getBalance("OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs")}`);
        let res = await bundler.withdrawBalance(10000);
        console.log(`withdrawl: ${res.data}`);
        console.log("done");
    } catch (e) {
        console.log(e);
    }
}
a();