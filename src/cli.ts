#!/usr/bin/env node

import { Command } from 'commander';
import { statSync, readFileSync } from 'fs';
import Bundlr from '.';
const program = new Command();
let options;


program
    .option("-h, --host <string>", "bundle hostname", "bundler.arweave.net")
    .option("-w, --wallet <string>", "Path to the .json file containing the JWK", "wallet.json")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("--port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
//.option("-v, --verbose", "Toggles verbose mode");


program
    .command("balance").description("Gets the loaded user's balance for the current bundler")
    .action(async () => {
        try {
            let bundlr = await init(options);
            const balance = await bundlr.getBalance()
            console.log(`Balance: ${balance} Winston (${(balance / 1000000000000).toFixed(5)}AR)`);
        } catch (err) {
            console.error(`Error whilst getting balance:\n${err}`);
        }
    });
program.command("withdraw").description("Sends a withdraw request to the bundler ").argument("<amount>", "amount")
    .action(async (amount) => {
        try {
            let bundlr = await init(options);
            let res = await bundlr.withdrawBalance(parseInt(amount));
            console.log(`Status: ${res.status}\nData: ${JSON.stringify(res.data)}`);
        } catch (err) {
            console.error(`Error whilst sending withdrawl request:\n${err}`);
        }
    });

options = program.opts();

async function init(opts) {
    let wallet = await loadWallet(opts.wallet);
    const bundlr = new Bundlr({ wallet, APIConfig: { host: opts.host, protocol: opts?.protocol, port: opts?.port, timeout: opts?.timeout } });
    console.log(`Loaded wallet for ${await bundlr.getAddress()}`);
    return bundlr;
}

async function loadWallet(path: string) {
    try {
        if (statSync(path)) {
            return JSON.parse(readFileSync("wallet.json").toString());
        } else {
            throw new Error(`Unable to load wallet: ${path}`)
        }
    } catch (e) {
        console.log(`Error reading wallet:\n${e}`);
    }
}

program.parse(process.argv);