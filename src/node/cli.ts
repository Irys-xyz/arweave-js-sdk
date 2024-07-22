#!/usr/bin/env node
// Note: DO NOT REMOVE/ALTER THE ABOVE LINE - it is called a 'shebang' and is vital for CLI execution.
import BigNumber from "bignumber.js";
import { Command } from "commander";
import { readFileSync } from "fs";
import inquirer from "inquirer";
import type NodeIrys from "./irys";
import Irys from "./irys";
import { checkPath } from "./upload";

export const program = new Command();

let balpad, walpad; // padding state variables

// Define the CLI flags for the program
program
  .option("-h, --host <string>", "Irys node hostname/URL (eg http://node1.irys.xyz)")
  .option("-n, --network <string>", "The network to use", "mainnet")
  .option("-w, --wallet <string>", "Path to keyfile or the private key itself", "default")
  .option("-t, --token <string>", "The token to use")
  .option("-c --currency <string>", "DEPRECATED: the currency to use (same as token)")
  .option("--timeout <number>", "The timeout (in ms) for API HTTP requests - increase if you get timeouts for upload")
  .option("--no-confirmation", "Disable confirmations for certain actions")
  .option("--tags [value...]", "Tags to include, format <name> <value>")
  .option(
    "--multiplier <number>",
    "Adjust the multiplier used for tx rewards - the higher the faster the network will process the transaction.",
    "1.00",
  )
  .option(
    "--batch-size <number>",
    "Adjust the upload-dir batch size (process more items at once - uses more resources (network, memory, cpu) accordingly!)",
    "5",
  )
  .option("-d, --debug", "Increases verbosity of errors and logs additional debug information. Used for troubleshooting.", false)
  .option("--index-file <string>", "Name of the file to use as an index for upload-dir manifests (relative to the path provided to upload-dir).")
  .option("--provider-url <string>", "Override the provider URL")
  .option("--contract-address <string>", "Override the contract address")
  .option("--content-type <string>", "Override the content type for *ALL* files uploaded")
  .option("--remove-deleted", "Removes previously uploaded (but now deleted) items from the manifest")
  .option("--force-chunking", "Forces usage of chunking for all files regardless of size");
// Define commands
// uses NPM view to query the package's version.
program.version(Irys.VERSION, "-v, --version", "Gets the current package version of the Irys client");

// Balance command - gets the provided address' balance on the specified bundler
program
  .command("balance")
  .description("Gets the specified user's balance for the current Irys node")
  .argument("<address>", "address")
  .action(async (address: string) => {
    try {
      options.address = balpad ? address.substring(1) : address;
      const irys = await init(options, "balance");
      const balance = await irys.utils.getBalance(options.address);
      console.log(`Balance: ${balance} ${irys.tokenConfig.base[0]} (${irys.utils.unitConverter(balance).toFixed()} ${irys.token})`);
    } catch (err: any) {
      console.error(`Error whilst getting balance: ${options.debug ? err.stack : err.message} `);
      return;
    }
  });

// Withdraw command - sends a withdrawal request for n base units to the specified bundler for the loaded wallet
program
  .command("withdraw")
  .description("Sends a fund withdrawal request")
  .argument("<amount>", "amount to withdraw in token base units")
  .action(async (amount: string) => {
    try {
      const irys = await init(options, "withdraw");
      const confirmed = await confirmation(
        `Confirmation: withdraw ${amount} ${irys.tokenConfig.base[0]} from ${irys.api.config.url.host} (${await irys.utils.getBundlerAddress(
          irys.token,
        )})?\n Y / N`,
      );
      if (confirmed) {
        const res = await irys.withdrawBalance(new BigNumber(amount));
        console.log(
          `Withdrawal request for ${res?.requested} ${irys.tokenConfig.base[0]} successful\nTransaction ID: ${res?.tx_id} with network fee ${res?.fee} for a total cost of ${res?.final} `,
        );
      } else {
        console.log("confirmation failed");
      }
    } catch (err: any) {
      console.error(`Error whilst sending withdrawal request: ${options.debug ? err.stack : err.message} `);
      return;
    }
  });

// Upload command - Uploads a specified file to the specified bundler using the loaded wallet.
program
  .command("upload")
  .description("Uploads a specified file")
  .argument("<file>", "relative path to the file you want to upload")
  .action(async (file: string) => {
    try {
      const irys = await init(options, "upload");
      const tags = parseTags(options?.tags);
      const res = await irys.uploadFile(file, { tags: tags ?? [] });
      console.log(`Uploaded to https://gateway.irys.xyz/${res?.id}`);
    } catch (err: any) {
      console.error(`Error whilst uploading file: ${options.debug ? err.stack : err.message} `);
      return;
    }
  });

program
  .command("upload-dir")
  .description("Uploads a folder (with a manifest)")
  .argument("<folder>", "relative path to the folder you want to upload")
  .action(async (folder: string) => {
    await uploadDir(folder);
  });

// Deploy command - DEPRECATED
program
  .command("deploy")
  .description("(DEPRECATED - use the functionally identical 'upload-dir' instead.) Deploys a folder (with a manifest) to the specified bundler")
  .argument("<folder>", "relative path to the folder you want to deploy")
  .action(async (folder: string) => {
    console.warn("WARN: Deploy is deprecated, use the functionally identical 'upload-dir' instead.");
    await uploadDir(folder);
  });

async function uploadDir(folder: string): Promise<void> {
  try {
    const irys = await init(options, "upload");
    const tags = parseTags(options?.tags);
    const res = await irys.uploadFolder(folder, {
      indexFile: options.indexFile,
      batchSize: +options.batchSize,
      interactivePreflight: options.confirmation,
      keepDeleted: !options.removeDeleted,
      manifestTags: tags ?? [],
      logFunction: async (log): Promise<void> => {
        console.log(log);
      },
      itemOptions: {
        upload: {},
      },
    });
    if (!res) return console.log("Nothing to upload");
    console.log(`Uploaded to https://gateway.irys.xyz/${res.id}`);
  } catch (err: any) {
    console.error(`Error whilst uploading ${folder} - ${options.debug ? err.stack : err.message}`);
  }
}

const parseTags = (arr: string[]): { name: string; value: string }[] | undefined => {
  if (!arr) return;
  if (arr.length % 2 !== 0) throw new Error(`Tags key is missing a value!`);
  return arr.reduce<{ name: string; value: string }[]>((a, v, i) => {
    (i + 1) % 2 === 0 ? (a.at(-1)!.value = v) : a.push({ name: v, value: "" });
    return a;
  }, []);
};

program
  .command("fund")
  .description("Funds your account with the specified amount of atomic units")
  .argument("<amount>", "Amount to add in atomic units")
  .action(async (amount: string) => {
    try {
      if (isNaN(+amount)) throw new Error("Amount must be an integer");
      const irys = await init(options, "fund");
      const confirmed = await confirmation(
        `Confirmation: send ${amount} ${irys.tokenConfig.base[0]} (${irys.utils.unitConverter(amount).toFixed()} ${irys.token}) to ${
          irys.api.config.url.host
        } (${await irys.utils.getBundlerAddress(irys.token)})?\n Y / N`,
      );
      if (confirmed) {
        const tx = await irys.fund(new BigNumber(amount), options.multiplier);
        console.log(`Funding receipt: \nAmount: ${tx.quantity} with Fee: ${tx.reward} to ${tx.target} \nTransaction ID: ${tx.id} `);
      } else {
        console.log("confirmation failed");
      }
    } catch (err: any) {
      console.error(`Error whilst funding: ${options.debug ? err.stack : err.message} `);
      return;
    }
  });

program
  .command("price")
  .description("Check how much of a specific token is required for an upload of <amount> bytes")
  .argument("<bytes>", "The number of bytes to get the price for")
  .action(async (bytes: string) => {
    try {
      if (isNaN(+bytes)) throw new Error("Amount must be an integer");
      const irys = await init(options, "price");
      await irys.utils.getBundlerAddress(options.token); // will throw if the bundler doesn't support the token
      const cost = await irys.utils.getPrice(options.token, +bytes);
      console.log(
        `Price for ${bytes} bytes in ${options.token} is ${cost.toFixed(0)} ${irys.tokenConfig.base[0]} (${irys.utils
          .unitConverter(cost)
          .toFixed()} ${irys.token})`,
      );
    } catch (err: any) {
      console.error(`Error whilst getting price: ${options.debug ? err.stack : err.message} `);
      return;
    }
  });

/**
 * Interactive CLI prompt allowing a user to confirm an action
 * @param message the message specifying the action they are asked to confirm
 */
async function confirmation(message: string): Promise<boolean> {
  if (!options?.confirmation) {
    return true;
  }
  const answers = await inquirer.prompt([{ type: "input", name: "confirmation", message }]);
  return answers.confirmation.toLowerCase() == "y";
}

/**
 * Initialisation routine for the CLI, mainly for initialising a Irys instance
 * @param opts the parsed options from the cli
 * @returns a new Irys instance
 */
async function init(opts, operation): Promise<Irys> {
  let wallet;
  let irys: NodeIrys;
  // every option needs a host/network and token so ensure they're present
  if (!(opts.host || opts.network)) {
    throw new Error("Host (-h) or network (-n) parameter is required!");
  }
  if (!opts.token) {
    throw new Error("token flag (-t, --token) is required!");
  }
  // some operations do not require a wallet
  if (!["balance", "price"].includes(operation)) {
    // require a wallet
    if (opts.wallet === "default") {
      // default to wallet.json under the right conditions
      if (opts.token === "arweave" && (await checkPath("./wallet.json"))) {
        wallet = await loadWallet("./wallet.json");
      } else {
        throw new Error("Wallet (-w) required for this operation!");
      }
    } else {
      // remove padding if present
      wallet = await loadWallet(walpad ? opts.wallet.substring(1) : opts.wallet);
    }
  }
  try {
    // create and ready the Irys instance
    irys = new Irys({
      url: opts.host,
      network: opts.network,
      token: opts.token.toLowerCase(),
      key: wallet ?? "",
      config: {
        providerUrl: opts.providerUrl,
        contractAddress: opts.contractAddress,
        timeout: opts.timeout,
        debug: opts.debug,
      },
    });
    await irys.ready();
  } catch (err: any) {
    throw new Error(`Error initialising Irys client - ${options.debug ? err.stack : err.message}`);
  }
  // log the loaded address
  if (wallet && irys.address) {
    console.log(`Loaded address: ${irys.address}`);
  }

  if (opts.contentType) {
    irys.uploader.contentType = opts.contentType;
  }
  if (opts.forceChunking) {
    irys.uploader.useChunking = true;
  }

  return irys;
}

/**
 * Loads a wallet file from the specified path into a JWK interface
 * @param path path to the JWK file
 * @returns JWK interface
 */
async function loadWallet(path: string): Promise<any> {
  if (await checkPath(path)) {
    if (options.debug) {
      console.log("Loading wallet file");
    }
    return JSON.parse(readFileSync(path).toString());
  } else {
    if (options.debug) {
      console.log("Assuming raw key instead of keyfile path");
    }
    return path;
  }
}

const options = program.opts();
if (options.currency) options.token = options.currency;

const isScript = require.main === module;
if (isScript) {
  // to debug CLI: log process argv, load into var, and run in debugger.

  // console.log(JSON.stringify(process.argv));
  // process.exit(1);

  // replace this with dumped array. (make sure to append/include --no-confirmation)
  const argv = process.argv;

  // padding hack
  // this is because B64URL strings can start with a "-" which makes commander think it's a flag
  // so we pad it with a char that is not part of the B64 char set to prevent wrongful detection
  // and then remove it later.

  const bal = argv.indexOf("balance") + 1;
  if (bal != 0 && argv[bal] && /-{1}[a-z0-9_-]{42}/i.test(argv[bal])) {
    balpad = true;
    argv[bal] = "[" + argv[bal];
  }
  // padding hack to wallet addresses as well
  const wal = (!argv.includes("-w") ? argv.indexOf("--wallet") : argv.indexOf("-w")) + 1;
  if (wal != 0 && argv[wal] && /-{1}.*/i.test(argv[wal])) {
    walpad = true;
    argv[wal] = "[" + argv[wal];
  }
  // pass the CLI our argv
  program.parse(argv);
}

export const exportForTesting = {
  path: __filename,
};
