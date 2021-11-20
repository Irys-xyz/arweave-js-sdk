# JS Client

### Installing the library

using npm:

`npm install @bundlr-network/client`

using Yarn:

`yarn add @bundlr-network/client`


All the below examples are for payment in Arweave. 
For other currencies, simply change your wallet and currency parameters

For more docs on native cross-chain storage (including $MATIC) and usage examples - go [here](https://docs.bundlr.network)

All units used by this Library/CLI are Atomic units - see the [faq](https://docs.bundlr.network/docs/faq) to learn more.

## Create a new Bundlr instance

```ts
import Bundlr from '@bundlr-network/client';

const jwk = JSON.parse(fs.readFileSync("wallet.json").toString());

const bundlr = new Bundlr("http://example.bundlr.network", "arweave", jwk);
```

### Get the wallet's address

```ts
bundlr.address
```

### Get the account's balance with the current bundler
```ts
await bundlr.getLoadedBalance() // 109864
```

### Get the balance of an arbitrary address with the current bundler

```ts
await bundlr.getBalance(address) // 10000 
```
### Get the bundler's Arweave address

```ts
await bundlr.getBundlerAddress(); // "OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs"
```

### Fund a bundler

```ts
await bundlr.fund(amount);
```

### Request a withdrawal from the bundler

```ts
let response = await bundlr.withdrawBalance(amount)
 
// withdrawl request status
response.status // http status code
 
// 400 - something went wrong
response.data  = "Not enough balance for requested withdrawl"
 
// 200 - Ok
response.data = {
    requested, // the requested amount,
    fee,       // the reward required by the network (network fee)
    final,     // the amount you will receive (requested - fee)
    tx_id,     // the Arweave ID of the withdrawl transaction
}
```

### Upload a file to the bundler

```ts
await bundlr.upload("./llama.jpg") // Returns an axios response from the gateway
```


In the event a withdrawal transaction is dropped, your Bundlr balance won't be affected.

# CLI

## Installation

```npm install -g @bundlr-network/client```

All the below examples are for payment in Arweave. Simply change your wallet (`-w`) and currency (`-c`) flags to use another currency


# CLI usage
```
Usage: bundlr [options] [command]

Options:
  -h, --host <string>      Bundler hostname/URL (eg http://node1.bundlr.network)
  -w, --wallet <string>    Path to keyfile or the private key itself (default: "default")
  -c, --currency <string>  the currency to use
  --timeout <number>       the timeout (in ms) for API HTTP requests
  --no-confirmation        Disable confirmations for fund and withdraw actions
  --multiplier <number>    Adjust the multiplier used for tx rewards - 
                           the higher the faster the network will process the
                           transaction. (default: "1.00")
  -v, --version            Gets the current package version of the bundlr client
  --help                   display help for command

Commands:
  balance <address>        Gets the specified user's balance for the current bundler
  withdraw <amount>        Sends a withdraw request to the bundler
  upload <file>            Uploads a specified file to the specified bundler
  fund <amount>            Sends the specified amount of Winston to the specified bundler
  price <bytes>            Check how much of a specific currency is required for an upload of
                           <amount> bytes
  help [command]           display help for command
```
## Example Usage
<b>Note:</b> to disable the confirmations for non-interactive operation, use the `--no-confirmation` flag. \
Anything that requires a wallet file (with currency set to arweave -withdraw, fund, upload)
will automatically try to load `"./wallet.json"`, unless overridden by the `-w` flag.
For non-arweave currencies, the -w flag is <b>Required</b>


### Get a user's balance

```sh
$ bundlr balance Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4 -h https://example.bundlr.network -c arweave
> Balance: 49999940705312 Winston (49.99994AR)
```

### Withdraw balance from the bundler

```sh
$ bundlr withdraw 1479016 -h https://example.bundlr.network -w wallet.json -c arweave
> ? Confirmation: withdraw 1479016 winston from example.bundlr.network (Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4)?
> Y / N y
> Status: 200 
> Data: {
>    "tx_id": "xcmxJmHyNS502fzqiT66rNeIOSldKGDWR8XsL9auDfs",
>    "requested": 1479016,
>    "fee": 1379016,
>    "final": 100000
> }
```
<b>Note:</b> as the network fee is taken from the requested amount, the amount you will actually recieve is the 'final' field
This also means you cannot withdraw any amount lower than the current network fee.

### Fund a bundler

```sh
$ bundlr fund 1479016 -h https://example.bundlr.network -w wallet.json -c arweave
> ? Confirmation: send 1479016 Winston to dev.bundlr.network (Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4)?
> Y / N y
> Funding receipt: 
> Amount: 1479016 with Fee: 1379016 to Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4 
> ID: 7cI6jpfpx6A2z8F5AoVHvZn9Az_BWPgvKzBCoE5w07A
```

### Upload a file to the bundler

```sh
$ bundlr upload image.png -h https://example.bundlr.network -w wallet.json -c arweave
> Status: 200 
> Data: {
>    "id":" A-Vj5TdHkcgjT_V7xnO_MTLYXfwKXfRtCCivTD1fzvY",
>    "signature": "c...NqDQ",
>    "block": 794646
 }
```

### Check the price of the Bundler

This command queries the Bundler to see how many base units of currency is required for an upload of the specified number of bytes
base units (aka atomic units) are normally fractions of the currency, for example:
1 AR = 1e12 Winston (the atomic unit for AR)

```sh
$ bundlr price 1000 -h https://example.bundlr.network -c arweave
> Price for 1000 bytes in arweave is 607718 winston
```

### note:
If you find an error that is not suitably descriptive, or that you believe is incorrect, let us know either via
our GitHub/Discord (links [here](https://docs.bundlr.network))
