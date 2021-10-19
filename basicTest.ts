import Bundlr from "./src/index";
import { readFileSync } from 'fs';

async function a() {
    try {
        const JWK = JSON.parse(readFileSync("wallet.json").toString());
        let bundler = new Bundlr({ wallet: JWK, APIConfig: { host: "dev.bundlr.network" } });
        console.log(bundler.getAddress());
        console.log(`balance: ${await bundler.getLoadedBalance()}`);
        console.log(`bundler balance: ${await bundler.getBalance("OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs")}`);
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