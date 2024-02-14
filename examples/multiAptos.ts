import { AptosAccount, FaucetClient } from "aptos";
import { NodeIrys } from "../src/node";

/**
 * This Example is for signing transactions (for irys uploads & Aptos transfers) using multiple participants
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

  // Create irys instance
  const irys = new NodeIrys({
    url: "https://devnet.irys.xyz",
    token: "multiAptos",
    key: wallet,
    config: {
      providerUrl: "https://fullnode.devnet.aptoslabs.com",
      tokenOpts: { collectSignatures },
    },
  });
  // Ready the instance
  await irys.ready();

  // check the address
  console.log("Account address", irys.address);

  // check your irys balance
  console.log("irys balance", irys.utils.unitConverter(await irys.getLoadedBalance()).toString());

  const data = "Hello, world!";
  // create a transaction for this data
  const tx = irys.createTransaction(data, { tags: [{ name: "Content-type", value: "text/plain" }] });
  // sign the transaction (this will call `collectSignatures`)
  await tx.sign();

  console.log(await tx.isValid());
  // fund the account using the Aptos faucet
  await new FaucetClient("https://fullnode.devnet.aptoslabs.com", "https://faucet.devnet.aptoslabs.com").fundAccount(irys.address, 5_000_000);

  // check the cost for uploading the tx
  const cost = await irys.getPrice(tx.size);
  console.log("Upload costs", irys.utils.unitConverter(cost).toString());

  // fund irys cost * 1.1, as prices can change between funding & upload completion (especially for larger files)
  await irys.fund(cost.multipliedBy(1.1).integerValue());

  // check your irys balance
  console.log("irys balance", irys.utils.unitConverter(await irys.getLoadedBalance()).toString());

  // upload the data
  const res = await tx.upload();

  // check your irys balance after the upload
  console.log("irys balance", irys.utils.unitConverter(await irys.getLoadedBalance()).toString());

  console.log(`Data uploaded to https://arweave.net/${res.id}`);
  // done!
})();
