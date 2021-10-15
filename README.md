# js-client
JS Client Lib for Bundlr Nodes
Usage:
Initialise a new instance:
// Load JWK from file (Node)
const JWK = JSON.parse(readFileSync("wallet.json").toString());
// Create instance for the account (JWK) on the bundler (host)
const bundler = new Bundler({wallet: JWK}, {host: "bundler.arweave.net"});

additional constructor options:
{
    wallet: JWK object,
    address: address of the wallet (Optional - automatically filled out by init)
}
{
    host: bundler hostname (eg 'bundler.arweave.net')
    protocol: HTTP/S as applicable (optional)
    port: port the bundler webserver is listening on (optional)
    timeout: ms to wait before aborting a request (optional - default 20000)
    logging: true/false (optional)
    logger: function to pass logging info to (optional)
}

// Initialise bundler fully
await bundler.init();

// Get the wallet's Arweave address
await bundler.getAddress() // => the loaded account's arweave address

// Get the loaded account's balance with the current bundler.
await bundler.getBalance() // => the loaded account's balance

// Get the balance of an arbitrary address with the current bundler.
await bundler.utils.getBalance(<address>) // get an arbitrary address' balance

// Request a withdrawl of <amount> winston from the bundler (will be sent back to current account).
await bundler.withdrawBalance(<amount>) // => <response> from the bundler for the withdrawl.
// withdrawl request status
<response>.status => 200, 400, etc
// withdrawl request data
<response>.data => {
    requested : the requested amount,
    reward: the reward required by the network,
    total: the total amount taken from your balance
    tx_id: the Arweave ID of the withdrawl transaction
}
// in the event a withdrawl transaction is dropped, bundler will refund the withdrawl amount after 100 blocks of the withdrawl request, and you can try again.
// the bundler will try to take the reward from the requested amount if you don't have enough in your account - this will naturally caused a reduced payment.

