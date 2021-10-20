#!/usr/bin/env node

import { Command } from 'commander';
import { statSync, readFileSync } from 'fs';
import Bundlr from '.';
const program = new Command();
import inquirer from 'inquirer';

let options;


program
    .option("-h, --host <string>", "bundle hostname")
    // .option("-a, --address <string>", "Override address")
    .option("-w, --wallet <string>", "Path to the .json file containing the JWK", "wallet.json")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("--port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
    .option("--no-confirmation", "Disable confirmations for fund and withdraw actions")
    .option("-gHost, --gatewayHost", "The gateway host to use (default arweave.net)", "arweave.net")
    .option("-gPort, --gatewayPort", "The port to use for the gateway", "80")
    .option("-gPort, --gatewayProtocol", "the protocol to use for the gateway", "HTTP")
    .option("-gTimeout, --gatewayTimeout", "Gateway request timeout", "40000")

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

program.command("withdraw").description("Sends a withdraw request to the bundler ").argument("<amount>", "amount to withdraw in Winston")
    .action(async (amount) => {
        try {
            let bundlr = await init(options);
            let res = await bundlr.withdrawBalance(parseInt(amount));
            console.log(`Status: ${res.status}\nData: ${JSON.stringify(res.data)}`);
        } catch (err) {
            console.error(`Error whilst sending withdrawl request:\n${err}`);
        }
    });
program.command("upload").description("Uploads a specified file to the specified bundler").argument("<file>", "relative path to the file you want to upload")
    .action(async (file) => {
        try {
            let bundlr = await init(options);
            let res = await bundlr.upload(file);
            console.log(`Status: ${res.status}\nData: ${JSON.stringify(res.data)}`);
        }
        catch (err) {
            console.error(`Error whilst uploading file:\n${err}`);
        }
    });
program.command("fund").description("Sends the specified amount of Winston to the specified bundler").argument("<amount>", "Amount to add in Winston")
    .action(async (amount) => {
        let bundlr = await init(options);
        await confirmation(`Comfirmation: send ${amount} Winston to ${bundlr.APIConfig.host} (${await bundlr.utils.getBundlerAddress()})?\n Y/N`).then(async (confirmed) => {
            if (confirmed) {
                let tx = await bundlr.fund(amount);
                console.log(tx);
                console.log(`Funding receipt:\nAmount: ${tx.quantity} with Reward: ${tx.reward} to ${tx.target}\nID: ${tx.id}`)
                console.log("note: funds can take up to 50 blocks to be detected by the bundler - funding can also fail if the tx is dropped by the network.")
            } else {
                console.log("confirmation failed")
            }
        })

    })
options = program.opts();


async function confirmation(message) {
    return new Promise(async (resolve) => {
        if (options.noConfirmation) {
            resolve(true);
        }
        inquirer.prompt([
            { type: 'input', name: 'confirmation', message }
        ]).then(answers => {
            console.log(answers);
            if (answers.confirmation == "Y" || answers.confirmation == "y") {
                resolve(false)
            }
            resolve(false)
        });
        resolve(false)
    })

}



async function init(opts) {
    let wallet;
    if (opts.wallet) {
        wallet = await loadWallet(opts.wallet);
    }
    console.log(JSON.stringify(opts));
    const bundlr = new Bundlr({
        wallet, address: opts?.address,
        APIConfig: { host: opts.host, protocol: opts?.protocol, port: opts?.port, timeout: opts?.timeout },
        gatewayConfig: { host: opts.gatewayHost, protocol: opts?.gatewayProtocol, port: opts?.gatewayPort, timeout: opts?.gatewayTimeout }
    });
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
        throw new Error(`Error reading wallet:\n${e}`);
    }
}

program.parse(process.argv);