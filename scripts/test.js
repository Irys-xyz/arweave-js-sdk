const readFileSync = require("fs").readFileSync
const Bundlr = require("../build/index.js").default //works

async function a() {
    //const Bundlr = (await import("./build/index.js")).default.default //works
    console.log(Bundlr)
    const JWK = JSON.parse(readFileSync("wallet.json").toString());
    const b = new Bundlr("https://dev1.bundlr.network", "arweave", JWK);
    console.log(await b.getLoadedBalance());
}
a()