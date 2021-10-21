#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync, statSync } from "fs";
import Bundlr from ".";
import inquirer from "inquirer";

const program = new Command();

// eslint-disable-next-line prefer-const
let options;

program
    .option("-h, --host <string>", "Bundler hostname")
    .option("-w, --wallet <string>", "Path to the .json file containing the JWK", "wallet.json")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("--port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
    .option("--no-confirmation", "Disable confirmations for fund and withdraw actions")
// .option("--gatewayHost <string>", "The gateway host to use (default arweave.net)", "arweave.net")
// .option("--gatewayPort <number>", "The port to use for the gateway", "80")
// .option("--gatewayProtocol <string>", "the protocol to use for the gateway", "HTTP")
// .option("---gatewayTimeout <number>", "Gateway request timeout", "40000")


program
    .command("balance").description("Gets the specified user's balance for the current bundler").argument("<address>", "address")
    .action(async (address) => {
        try {
            options.address = address;
            const bundlr = await init(options);
            const balance = await bundlr.utils.getBalance(address);
            console.log(`Balance: ${balance} Winston (${(balance / 1000000000000).toFixed(14)}AR)`);
        } catch (err) {
            console.error(`Error whilst getting balance: \n${err} `);
            return;
        }
    });

program.command("withdraw").description("Sends a withdraw request to the bundler ").argument("<amount>", "amount to withdraw in Winston")
    .action(async (amount) => {
        try {
            const bundlr = await init(options);
            confirmation(`Confirmation: withdraw ${amount} winston from ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress()})?\n Y / N`).then(async (confirmed) => {
                if (confirmed) {
                    const res = await bundlr.withdrawBalance(parseInt(amount));
                    console.log(`Status: ${res.status} \nData: ${JSON.stringify(res.data)} `);
                } else {
                    console.log("confirmation failed");
                }
            })
        } catch (err) {
            console.error(`Error whilst sending withdrawl request: \n${err} `);
            return;
        }
    });
program.command("upload").description("Uploads a specified file to the specified bundler").argument("<file>", "relative path to the file you want to upload")
    .action(async (file) => {
        try {
            const bundlr = await init(options);
            const res = await bundlr.upload(file);
            console.log(`Status: ${res.status} \nData: ${JSON.stringify(res.data)} `);
        } catch (err) {
            console.error(`Error whilst uploading file: \n${err} `);
            return;
        }
    });
program.command("fund").description("Sends the specified amount of Winston to the specified bundler").argument("<amount>", "Amount to add in Winston")
    .action(async (amount) => {
        try {
            const bundlr = await init(options);
            confirmation(`Confirmation: send ${amount} Winston to ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress()})?\n Y / N`).then(async (confirmed) => {
                if (confirmed) {
                    const tx = await bundlr.fund(amount);
                    console.log(`Funding receipt: \nAmount: ${tx.quantity} with Fee: ${tx.reward} to ${tx.target} \nID: ${tx.id} `)
                } else {
                    console.log("confirmation failed")
                }
            })

        } catch (err) {
            console.error(`Error whilst funding: \n${err} `);
            return;
        }
    })


async function confirmation(message) {
    if (!options.confirmation) {
        return true;
    }
    const answers = await inquirer.prompt([
        { type: "input", name: "confirmation", message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}

function protocolToPort(protocol: string) {
    if (protocol === "http") return 80
    else if (protocol === "https") return 443
    else throw new Error("Not a valid protocol");
}

async function init(opts) {
    let wallet;
    if (!opts.address) {
        wallet = await loadWallet(opts.wallet);
    }
    // every option needs a host so ensure it's present
    if (!opts.host) {
        throw new Error("Host parameter (-h) is required!");
    }
    const protocol = opts.protocol ?? "http";
    const url = `${protocol}://${opts.host}:${opts.port ?? protocolToPort(protocol)}`;
    return new Bundlr(url, wallet);
}

async function loadWallet(path: string) {
    try {
        if (statSync(path)) {
            return JSON.parse(readFileSync(path).toString());
        } else {
            console.error(`Unable to load wallet: ${path}`);
        }
    } catch (e) {
        console.error(`Error reading wallet:\n${e}`);
        process.exit(1);
    }
}

options = program.opts();
program.parse(process.argv);
