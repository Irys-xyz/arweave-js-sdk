
import { readFileSync, promises } from "fs";
import Bundlr from "../src";
// import the client
//import Bundlr from "@bundlr-network/client"

async function main() {
    // arweave only: load + parse your keyfile
    const key = JSON.parse(readFileSync("wallet.json").toString());
    // other currencies - set key as your private key string

    // initialise a bundlr client
    const bundlr = new Bundlr("https://node1.bundlr.network", "arweave", key)

    // get your account address (associated with your private key)
    const address = bundlr.address

    // get your accounts balance
    const balance = await bundlr.getLoadedBalance();

    // convert it into decimal units
    const decimalBalance = bundlr.utils.unitConverter(balance)



    // you should have 0 balance (unless you've funded before), so lets add some funds:
    // Reminder: this is in atomic units (see https://docs.bundlr.network/docs/faq#what-are-baseatomic-units)
    const fundStatus = await bundlr.fund(100_000_000)

    //want to know how much you'll need for an upload? simply:
    // get the number of bytes you want to upload
    const size = (await promises.stat("./data.txt")).size
    // query the bundlr node to see the price for that amount
    const cost = await bundlr.getPrice(size);
}
main()