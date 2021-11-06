#!/usr/bin/env node
// Note: DO NOT REMOVE/ALTER THE ABOVE LINE - it is called a 'shebang' and is vital for CLI execution.
import { Command } from "commander";
import { readFileSync, statSync } from "fs";
import Bundlr from ".";
import inquirer from "inquirer";
import { execSync } from "child_process"

const program = new Command();

// Define the CLI flags for the program
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

// Define commands

program.version(execSync("npm view @bundlr-network/client version").toString(), "-v", "Gets the current package version of the bundlr client");

// Balance command - gets the provided address' balance on the specified bundler
program
    .command("balance").description("Gets the specified user's balance for the current bundler").argument("<address>", "address")
    .action(async (address: string) => {
        try {
            address = address.substring(1);
            options.address = address;
            const bundlr = await init(options);
            const balance = await bundlr.utils.getBalance(address);
            console.log(`Balance: ${balance} Winston (${(balance / 1000000000000).toFixed(14)}AR)`);
        } catch (err) {
            console.error(`Error whilst getting balance: \n${err} `);
            return;
        }
    });

// Withdraw command - sends a withdrawl request for n winston to the specified bundler for the loaded wallet
program.command("withdraw").description("Sends a withdraw request to the bundler ").argument("<amount>", "amount to withdraw in Winston")
    .action(async (amount: string) => {
        try {
            const bundlr = await init(options);
            confirmation(`Confirmation: withdraw ${amount} winston from ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress()})?\n Y / N`).then(async (confirmed) => {
                if (confirmed) {
                    const res = await bundlr.withdrawBalance(parseInt(amount));
                    console.log(`Status: ${res.status} \nData: ${JSON.stringify(res.data, null, 4)} `);
                } else {
                    console.log("confirmation failed");
                }
            })
        } catch (err) {
            console.error(`Error whilst sending withdrawl request: \n${err} `);
            return;
        }
    });

// Upload command - Uploads a specified file to the specified bundler using the loaded wallet
program.command("upload").description("Uploads a specified file to the specified bundler").argument("<file>", "relative path to the file you want to upload")
    .action(async (file: string) => {
        try {
            const bundlr = await init(options);
            const res = await bundlr.uploadFile(file);
            console.log(`Status: ${res.status} \nData: ${JSON.stringify(res.data, null, 4)} `);
        } catch (err) {
            console.error(`Error whilst uploading file: \n${err} `);
            return;
        }
    });

// Fund command - Sends the specified bundler n winston from the loaded wallet
program.command("fund").description("Sends the specified amount of Winston to the specified bundler").argument("<amount>", "Amount to add in Winston")
    .action(async (amount: string) => {
        if (isNaN(+amount)) throw new Error("Amount must be an integer");
        try {
            const bundlr = await init(options);
            confirmation(`Confirmation: send ${amount} Winston to ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress()})?\n Y / N`).then(async (confirmed) => {
                if (confirmed) {
                    const tx = await bundlr.fund(+amount);
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

/**
 * Interactive CLI prompt allowing a user to confirm an action
 * @param message the message specifying the action they are asked to confirm
 * @returns if the user has confirmed
 */
async function confirmation(message: string): Promise<boolean> {
    if (!options.confirmation) {
        return true;
    }
    const answers = await inquirer.prompt([
        { type: "input", name: "confirmation", message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}

/**
 * Converts a protocol to the proper port
 * @param protocol protocol to convert (http/https)
 * @returns the proper port (80/443)
 */
function protocolToPort(protocol: string) {
    if (protocol === "http") return 80
    else if (protocol === "https") return 443
    else throw new Error("Not a valid protocol");
}

/**
 * Initialisation routine for the CLI, mainly for initialising a Bundlr instance
 * @param opts the parsed options from the cli
 * @returns a new Bundlr instance
 */
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

/**
 * Loads a wallet file from the specified path into a JWK interface
 * @param path path to the JWK file
 * @returns JWK interface
 */
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

const options = program.opts();
const Argv = process.argv;

if (Argv[2] == "balance") {
    Argv[3] = "[" + Argv[3];
}
program.parse(Argv);
