#!/usr/bin/env node

import { Command } from 'commander';
import { statSync, readFileSync } from 'fs';
import Bundlr from '.';
const program = new Command();
let options;


program
    .option("-h, --host <string>", "bundle hostname")
    // .option("-a, --address <string>", "Override address")
    .option("-w, --wallet <string>", "Path to the .json file containing the JWK", "wallet.json")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("--port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
//.option("-v, --verbose", "Toggles verbose mode");


program
    .command("balance").description("Gets the specified user's balance for the current bundler").argument("<address>", "address")
    .action(async (address) => {
        try {
            let balance;
            options.address = address;
            let bundlr = await init(options);
            balance = await bundlr.utils.getBalance(address)
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
    const bundlr = new Bundlr({ wallet, address: opts?.address, APIConfig: { host: opts.host, protocol: opts?.protocol, port: opts?.port, timeout: opts?.timeout } });
    console.log(`Loaded Address: ${bundlr.address}`);
    return bundlr;
}

async function loadWallet(path: string) {
    try {
        if (statSync(path)) {
            return JSON.parse(readFileSync(path).toString());
        } else {
            throw new Error(`Unable to load wallet: ${path}`)
        }
    } catch (e) {
        console.log(`Error reading wallet:\n${e}`);
    }
}

program.parse(process.argv);