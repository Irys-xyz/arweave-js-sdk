import * as fs from "fs"
import Crypto from "crypto"

async function genData() {
    const num = 1200;
    fs.promises.mkdir("./testFolder").catch((_e) => console.log(_e))
    fs.promises.unlink("./testFolder-manifest.json").catch((_e) => console.log(_e))
    for (let i = 0; i < num; i++) {
        await fs.promises.writeFile(`./testFolder/${i}.txt`, Crypto.randomBytes(4000000).toString("base64"));
        if (i % (num / 10) == 1) {
            console.log(i);
        }
    }
    console.log("done");
}
genData()