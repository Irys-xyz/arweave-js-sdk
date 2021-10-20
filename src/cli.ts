#!/usr/bin/env node

import { Command } from 'commander';
import { statSync, readFileSync } from 'fs';
import Bundlr from '.';
const program = new Command();
import inquirer from 'inquirer';

let options;


program
    .option("-h, --host <string>", "bundle hostname")
    .option("-w, --wallet <string>", "Path to the .json file containing the JWK", "wallet.json")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("--port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
    .option("--no-confirmation", "Disable confirmations for fund and withdraw actions")
    .option("--gatewayHost <string>", "The gateway host to use (default arweave.net)", "arweave.net")
    .option("--gatewayPort <number>", "The port to use for the gateway", "80")
    .option("--gatewayProtocol <string>", "the protocol to use for the gateway", "HTTP")
    .option("---gatewayTimeout <number>", "Gateway request timeout", "40000")




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
            confirmation(`Confirmation: withdraw ${amount} winston from ${bundlr.APIConfig.host} (${await bundlr.utils.getBundlerAddress()})?\n Y/N `).then(async (confirmed) => {
                if (confirmed) {
                    let res = await bundlr.withdrawBalance(parseInt(amount));
                    console.log(`Status: ${res.status}\nData: ${JSON.stringify(res.data)}`);
                } else {
                    console.log("confirmation failed");
                }
            })
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
        try {
            let bundlr = await init(options);
            confirmation(`Confirmation: send ${amount} Winston to ${bundlr.APIConfig.host} (${await bundlr.utils.getBundlerAddress()})?\n Y/N`).then(async (confirmed) => {
                if (confirmed) {
                    let tx = await bundlr.fund(amount);
                    console.log(`Funding receipt:\nAmount: ${tx.quantity} with Reward: ${tx.reward} to ${tx.target}\nID: ${tx.id}`)
                    console.log("note: funds can take up to 50 blocks to be detected by the bundler - funding can also fail if the tx is dropped by the network.")
                } else {
                    console.log("confirmation failed")
                }
            })

        } catch (err) {
            console.error(`Error whilst funding: ${err}`);
        }
    })



async function confirmation(message) {
    if (!options.confirmation) {
        return true;
    }
    const answers = await inquirer.prompt([
        { type: 'input', name: 'confirmation', message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}



async function init(opts) {
    let wallet;
    if (!opts.address) {
        wallet = await loadWallet(opts.wallet);
    }
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

options = program.opts();
program.parse(process.argv);
