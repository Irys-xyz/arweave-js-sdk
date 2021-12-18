#!/usr/bin/env node
// Note: DO NOT REMOVE/ALTER THE ABOVE LINE - it is called a 'shebang' and is vital for CLI execution.
import { Command, OptionValues } from "commander";
import { readFileSync, statSync } from "fs";
import Bundlr from "./bundlr";
import inquirer from "inquirer";
import { execSync } from "child_process"
import BigNumber from "bignumber.js";

const program = new Command();

// Define the CLI flags for the program
program
    .option("-h, --host <string>", "Bundler hostname/URL (eg http://node1.bundlr.network)")
    .option("-w, --wallet <string>", "Path to keyfile or the private key itself", "default")
    .option("-c, --currency <string>", "the currency to use")
    .option("--timeout <number>", "the timeout (in ms) for API HTTP requests")
    .option("--no-confirmation", "Disable confirmations for fund and withdraw actions")
    .option("--multiplier <number>", "Adjust the multiplier used for tx rewards - the higher the faster the network will process the transaction.", "1.00")

// Define commands
// uses NPM view to query the package's version.
program.version(execSync("npm view @bundlr-network/client version").toString().replace("\n", ""), "-v, --version", "Gets the current package version of the bundlr client");

// Balance command - gets the provided address' balance on the specified bundler
program
    .command("balance").description("Gets the specified user's balance for the current bundler").argument("<address>", "address")
    .action(async (address: string) => {
        try {
            address = address.substring(1);
            options.address = address;
            const bundlr = await init(options, "balance");
            const balance = await bundlr.utils.getBalance(address);
            console.log(`Balance: ${balance} ${bundlr.currencyConfig.base[0]} (${(balance.dividedToIntegerBy(bundlr.currencyConfig.base[1]))} ${bundlr.currency})`);
        } catch (err) {
            console.error(`Error whilst getting balance: \n${err} `);
            return;
        }
    });

// Withdraw command - sends a withdrawl request for n winston to the specified bundler for the loaded wallet
program.command("withdraw").description("Sends a withdraw request to the bundler").argument("<amount>", "amount to withdraw in currency base units")
    .action(async (amount: string) => {
        try {
            const bundlr = await init(options, "withdraw");
            confirmation(`Confirmation: withdraw ${amount} ${bundlr.currencyConfig.base[0]} from ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress(bundlr.currency)})?\n Y / N`).then(async (confirmed) => {
                if (confirmed) {
                    const res = await bundlr.withdrawBalance(new BigNumber(amount));
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
            const bundlr = await init(options, "upload");
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
            const bundlr = await init(options, "fund");
            confirmation(`Confirmation: send ${amount} ${bundlr.currencyConfig.base[0]} (${(+amount / bundlr.currencyConfig.base[1])} ${bundlr.currency}) to ${bundlr.api.config.host} (${await bundlr.utils.getBundlerAddress(bundlr.currency)})?\n Y / N`)
                .then(async (confirmed) => {
                    if (confirmed) {
                        const tx = await bundlr.fund(new BigNumber(amount), options.multiplier);
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
// Price command - tells the user how many base units of <currency> is needed for <bytes> bytes on the bundlr (with current conditions)
program.command("price").description("Check how much of a specific currency is required for an upload of <amount> bytes").argument("<bytes>", "The number of bytes to get the price for")
    .action(async (bytes: string) => {
        if (isNaN(+bytes)) throw new Error("Amount must be an integer");
        try {
            const bundlr = await init(options, "price");
            await bundlr.utils.getBundlerAddress(options.currency) //will throw if the bundler doesn't support the currency
            //const cost = new BigNumber((await bundlr.api.get(`/price/${options.currency}/${bytes}`)).data)
            const cost = await bundlr.utils.getStorageCost(options.currency, parseInt(bytes));
            console.log(`Price for ${bytes} bytes in ${options.currency} is ${cost.toFixed(0)} ${bundlr.currencyConfig.base[0]} (${cost.dividedBy(bundlr.currencyConfig.base[1])} ${bundlr.currency})`);
        } catch (err) {
            console.error(`Error whilst getting price: \n${err} `);
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
 * Initialisation routine for the CLI, mainly for initialising a Bundlr instance
 * @param opts the parsed options from the cli
 * @returns a new Bundlr instance
 */
async function init(opts: OptionValues, operation: string): Promise<Bundlr> {
    let wallet: any;
    let bundler: Bundlr;

    if (!opts.currency) {
        throw new Error("currency flag (-c) is required!");
    }
    // every option needs a host so ensure it's present
    if (!opts.host) {
        throw new Error("Host parameter (-h) is required!");
    }
    if (!(["balance", "price"].includes(operation))) {
        // require a wallet
        if (opts.wallet === "default") {
            if (opts.currency === "arweave") {
                wallet = await loadWallet("./wallet.json");
            } else {
                throw new Error("Wallet (-w) required for this operation!")
            }
        } else {
            wallet = await loadWallet(opts.wallet.substring(1));
        }
    }

    try {
        bundler = new Bundlr(opts.host, opts.currency.toLowerCase(), wallet);
    } catch (err) {
        throw new Error(`Error initialising Bundlr client - ${err}`);
    }
    if (bundler.wallet != "default") {
        console.log(`Loaded address: ${bundler.address}`);
    }

    return bundler;
}

/**
 * Loads a wallet file from the specified path into a JWK interface
 * @param path path to the JWK file
 * @returns JWK interface
 */
async function loadWallet(path: string): Promise<any> {
    try {
        statSync(path)
        console.log("loading wallet file");
        return JSON.parse(readFileSync(path).toString());
    } catch (err) {
        console.log("assuming raw key instead of keyfile path");
        return path;
    }

}

const options = program.opts();

// to debug CLI: log wanted argv, load into var, and get it to parse.
// console.log(JSON.stringify(process.argv));
// process.exit(1);

// replace this with dumped array.
const argv = process.argv;
//balance padding hack
// this is beacuse addresses/wallets can start with a "-" which makes commander think it's a flag
// so we pad it with a char that is not part of the B64 char set to prevent wrongful detection
// and then remove it later.
const bal = argv.indexOf("balance") + 1;
if (bal != 0 && argv[bal]) {
    argv[bal] = "[" + argv[bal];
}
// padding hack to wallet addresses as well
const wal = ((argv.indexOf("-w") == -1) ? argv.indexOf("--wallet") : argv.indexOf("-w")) + 1
if (wal != 0 && argv[wal]) {
    argv[wal] = "[" + argv[wal]
}
// pass the CLI the modified argv
program.parse(argv);
