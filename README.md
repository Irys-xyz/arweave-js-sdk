# js-client
JS Client Lib for interacting with Bundlr Nodes.
## Installing the Library
using npm:

```npm install @bundlr-network/bundlr```

using Yarn:

```yarn add @bundlr-network/bundlr```

## Create a new Bundlr instance

```ts
import Bundlr from '@bundlr-network/bundlr';
const jwk = JSON.parse(fs.readFileSync("wallet.json").toString());
// Create instance for the account (JWK) on the bundler (host)
const bundler = new Bundlr("http://example.bundlr.network", jwk);
```

### Get the wallet's address
 
```ts
bundler.address //  "vpcXXvh7dHCiKPot8Xeglsqz4o4OcITiHl8PiG21B-U"
```

### Get the account's balance with the current bundler (in winston)
```ts
await bundler.getLoadedBalance() // 109864
```

### Get the balance of an arbitrary address with the current bundler (in winston)

```ts
await bundler.getBalance(address) // 10000 
```
### Get the bundler's Arweave address

```ts
await bundler.getBundlerAddress(); //  "OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs"
```

### Move funds (add balance to) the bundler

```ts
await bundler.fund(amount) // standard arweave TX object 
// (see https://github.com/ArweaveTeam/arweave-js/blob/master/src/common/lib/transaction.ts )
```

### Upload a file to the bundler

```ts
await bundler.upload("./llama.jpg") // Returns an axios response from the gateway
```

### Request a withdrawl of <amount> winston from the bundler

```ts
let response = await bundler.withdrawBalance(amount)
// withdrawl request status
response.status // http status code, 200 = ok, 400 = something went wrong
// status code 400 - data is the error message of the error encountered by the bundler
response.data // "Not enough balance for requested withdrawl"
// status code 200 - data is your withdrawl 'receipt'
response.data = {
    requested, // the requested amount,
    fee,       // the reward required by the network (network fee)
    final,     // the amount you will receive (requested - fee)
    tx_id,     // the Arweave ID of the withdrawl transaction
}
```
In the event a withdrawl transaction is dropped, your Bundlr balance won't be affected
# CLI usage
```Usage: bundlr [options] [command]

Options:
  -h, --host <string>    bundle hostname
  -w, --wallet <string>  Path to the .json file containing the JWK (default: "wallet.json")
  --protocol <string>    The protocol to use to connect to the bundler
  --port <number>        The port used to connect to the bundler
  --timeout <number>     the timeout (in ms) for API HTTP requests
  --no-confirmation      Disable confirmations for fund and withdraw actions
  --help                 display help for command

Commands:
  balance <address>      Gets the specified user's balance for the current bundler
  withdraw <amount>      Sends a withdraw request to the bundler
  upload <file>          Uploads a specified file to the specified bundler
  fund <amount>          Sends the specified amount of Winston to the specified bundler
  help [command]         display help for command
```
## Example Usage
 Note: to disable the confirmations for non-interactive operation, use the `--no-confirmation` flag. \
 Anything that requires a wallet file (withdraw, fund, upload) will automatically try to load `"./wallet.json"`, unless overridden by the `-w` flag.

 ### Get a user's balance
 
```sh
$ bundlr balance Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4 -h example.bundlr.network
> Balance: 49999940705312 Winston (49.99994AR)
```
 
### Withdraw balance from the bundler
 
```sh
$ bundlr withdraw 1479016 -h example.bundlr.network -w wallet.json
> ? Confirmation: withdraw 1479016 winston from example.bundlr.network (Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4)?
> Y / N y
> Status: 200 
> Data: {"tx_id":"xcmxJmHyNS502fzqiT66rNeIOSldKGDWR8XsL9auDfs","requested":1479016,"fee":1379016,"final":100000}
```
 #### Note: as the network fee is taken from the requested amount, the amount you will actually recieve is the 'final' field
 #### This also means you cannot withdraw any amount lower than the current network fee.
 
### Fund (add balance to) A bundler

```sh
$ bundlr fund 1479016 -h example.bundlr.network -w wallet.json
> ? Confirmation: send 1479016 Winston to dev.bundlr.network (Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4)?
> Y / N y
> Funding receipt: 
> Amount: 1479016 with Fee: 1379016 to Ry2bDGfBIvYtvDPYnf0eg_ijH4A1EDKaaEEecyjbUQ4 
> ID: 7cI6jpfpx6A2z8F5AoVHvZn9Az_BWPgvKzBCoE5w07A
```
 
 ### Upload a file to the bundler
 
```sh
$ bundlr upload a.txt -h dev.bundlr.network
> Status: 200 
> Data: {"id":"A-Vj5TdHkcgjT_V7xnO_MTLYXfwKXfRtCCivTD1fzvY","signature":"c...NqDQ","block":794646}
```
 
