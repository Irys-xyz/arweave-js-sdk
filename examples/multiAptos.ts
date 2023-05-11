import { AptosAccount, FaucetClient } from "aptos";
import Bundlr from "../src";

/**
 * This Example is for signing transactions (for bundlr uploads & Aptos transfers) using multiple participants
 * it assumes you are familiar with Aptos' MultiSignature terminology/example
 */
(async function () {
  // Genereate 3 key pairs and account instances
  const account1 = new AptosAccount();
  const account2 = new AptosAccount();
  const account3 = new AptosAccount();

  // Create wallet object
  // note: the order of the participants is important!

  const wallet = { participants: [account1, account2, account3].map((a) => a.signingKey.publicKey), threshold: 2 };

  // create signature collection function
  // this function is called whenever the client needs to collect signatures for signing
  const collectSignatures = async (message: Uint8Array) => {
    // get account 1 & 3 to sign the message
    const signatures = [account1, account3].map((a) => Buffer.from(a.signBuffer(message).toUint8Array()));
    // bitmap signifies which participants (accounts) signed this message, it's 0 indexed, so this bitmap means account 1 & 3
    // !!this order must be the same as wallet.participants!!
    return { signatures: signatures, bitmap: [0, 2] };
  };

  // Create bundlr instance
  const bundlr = new Bundlr("https://devnet.bundlr.network", "multiAptos", wallet, {
    providerUrl: "https://fullnode.devnet.aptoslabs.com",
    currencyOpts: { collectSignatures },
  });
  // Ready the instance
  await bundlr.ready();

  //check the address
  console.log("Account address", bundlr.address);

  //check your Bundlr balance
  console.log("Bundlr balance", bundlr.utils.unitConverter(await bundlr.getLoadedBalance()).toString());

  const data = "Hello, world!";
  // create a transaction for this data
  const tx = bundlr.createTransaction(data, { tags: [{ name: "Content-type", value: "text/plain" }] });
  //sign the transaction (this will call `collectSignatures`)
  await tx.sign();

  // fund the account using the Aptos faucet
  await new FaucetClient("https://fullnode.devnet.aptoslabs.com", "https://faucet.devnet.aptoslabs.com").fundAccount(bundlr.address, 5_000_000);

  // check the cost for uploading the tx
  const cost = await bundlr.getPrice(tx.size);
  console.log("Upload costs", bundlr.utils.unitConverter(cost).toString());

  //fund bundlr cost * 1.1, as prices can change between funding & upload completion (especially for larger files)
  await bundlr.fund(cost.multipliedBy(1.1).integerValue());

  //check your Bundlr balance
  console.log("Bundlr balance", bundlr.utils.unitConverter(await bundlr.getLoadedBalance()).toString());

  //upload the data
  const res = await tx.upload();

  //check your Bundlr balance after the upload
  console.log("Bundlr balance", bundlr.utils.unitConverter(await bundlr.getLoadedBalance()).toString());

  console.log(`Data uploaded to https://arweave.net/${res.data.id}`);
  // done!
})();
