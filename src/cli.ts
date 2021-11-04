#!/usr/bin/env node
// Note: DO NOT REMOVE/ALTER THE ABOVE LINE - it is called a 'shebang' and is vital for CLI execution.
import { Command } from "commander";
import { readFileSync, statSync } from "fs";
import Bundlr from ".";
import inquirer from "inquirer";

const program = new Command();

// Define the CLI flags for the program
program
    .option("-h, --host <string>", "Bundler hostname")
    .option("-w, --wallet <string>", "Path to keyfile or the private key itself", "wallet.json")
    .option("-c, --currency <string>", "the currency to use")
    .option("--protocol <string>", "The protocol to use to connect to the bundler")
    .option("-p, --port <number>", "The port used to connect to the bundler")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
    .option("--no-confirmation", "Disable confirmations for fund and withdraw actions")
    .option("--multiplier <number>", "Adjust the multiplier used for tx rewards - the higher the faster the network will process the transaction.", "1.00")

// .option("--gatewayHost <string>", "The gateway host to use (default arweave.net)", "arweave.net")
// .option("--gatewayPort <number>", "The port to use for the gateway", "80")
// .option("--gatewayProtocol <string>", "the protocol to use for the gateway", "HTTP")
// .option("---gatewayTimeout <number>", "Gateway request timeout", "40000")

// Define commands

// Balance command - gets the provided address' balance on the specified bundler
program
    .command("balance").description("Gets the specified user's balance for the current bundler").argument("<address>", "address")
    .action(async (address: string) => {
        try {
            options.address = address;
            console.log(address);
            const bundlr = await init(options);
            const balance = await bundlr.utils.getBalance(address);
            console.log(`Balance: ${balance} ${bundlr.currencyConfig.base[0]} (${(balance / bundlr.currencyConfig.base[1])} ${bundlr.currency})`);
        } catch (err) {
            console.error(`Error whilst getting balance: \n${err} `);
            return;
        }
    });

// Withdraw command - sends a withdrawl request for n winston to the specified bundler for the loaded wallet
program.command("withdraw").description("Sends a withdraw request to the bundler").argument("<amount>", "amount to withdraw in currency base units")
    .action(async (amount: string) => {
        try {
            const bundlr = await init(options);
            confirmation(`Confirmation: withdraw ${amount} ${bundlr.currencyConfig.base[0]} from ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress(bundlr.currency)})?\n Y / N`).then(async (confirmed) => {
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


// program.command("convert").description("converts standard currency units to base units for use with this tool").argument("<amount>", "amount to convert")
//     .action(async (amount: string) => {
//         try {

//         } catch (err) {
//             console.error(`Error converting: \n${err}`);
//         }
//     })

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
            //confirmation(`Confirmation: send ${amount} Winston (${(+amount / 1000000000000).toFixed(14)}AR) to ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress("arweave")})?\n Y / N`)
            confirmation(`Confirmation: send ${amount} ${bundlr.currencyConfig.base[0]} (${(+amount / bundlr.currencyConfig.base[1])} ${bundlr.currency}) to ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress(bundlr.currency)})?\n Y / N`)
                .then(async (confirmed) => {
                    if (confirmed) {
                        const tx = await bundlr.fund(+amount, options.multiplier);
                        console.log(`Funding receipt: \nAmount: ${tx.quantity} with Fee: ${tx.reward} to ${tx.target} \nTransaction ID: ${tx.id} `)
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
    let bundler;
    if (!opts.address) {
        wallet = await loadWallet(opts.wallet);
    }
    if (!opts.currency) {
        throw new Error("currency flag (-c) is required!");
    }
    // every option needs a host so ensure it's present
    if (!opts.host) {
        throw new Error("Host parameter (-h) is required!");
    }

    const protocol = opts.protocol ?? "http";
    const url = `${protocol}://${opts.host}:${opts.port ?? protocolToPort(protocol)}`;
    try {
        bundler = new Bundlr(url, opts.currency.toLowerCase(), wallet);
    } catch (err) {
        throw new Error(`Error initialising Bundlr client - ${JSON.stringify(err)}`);
    }
    console.log(`Loaded address: ${bundler.address}`)
    return bundler;
}

/**
 * Loads a wallet file from the specified path into a JWK interface
 * @param path path to the JWK file
 * @returns JWK interface
 */
async function loadWallet(path: string) {
    try {
        statSync(path)
        return JSON.parse(readFileSync(path).toString());
    } catch (err) {
        console.log("assuming raw key instead of keyfile path");
        return path;
    }

}

const options = program.opts();
// to debug CLI: log wanted argv, load into var, and get it to parse.
console.log(JSON.stringify(process.argv));

//const Argv = ["/usr/local/bin/node", "/usr/local/share/npm-global/bin/bundlr", "balance", "7smNXWVNbTinRPuKbrke0XR0N9N6FgTBVCh20niXEbU", "-h", "dev.bundlr.network"];
//const Argv = ["/usr/local/bin/node", "/usr/local/share/npm-global/bin/bundlr", "withdraw", "1000", "-h", "dev.bundlr.network", "-c", "arweave", "--no-confirmation"]
//const Argv = ["/usr/local/bin/node", "/usr/local/share/npm-global/bin/bundlr", "fund", "1000", "-h", "dev.bundlr.network", "-w", "29c17feb590ef5471d4f1d203e3525cbcb3073ccbdc593cd39a9cfff2415eeb0", "-c", "matic", "--no-confirmation"];
//const Argv = ["/usr/local/bin/node", "/usr/local/share/npm-global/bin/bundlr", "upload", "./a.txt", "-h", "dev.bundlr.network", "-w", "29c17feb590ef5471d4f1d203e3525cbcb3073ccbdc593cd39a9cfff2415eeb0", "-c", "matic"];
const Argv = process.argv;
program.parse(Argv);