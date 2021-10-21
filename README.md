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
    requested, //the requested amount,
    fee, //the reward required by the network (network fee)
    final, //the amount you will receive (requested - fee)
    tx_id, //the Arweave ID of the withdrawl transaction
}
```
In the event a withdrawl transaction is dropped, your Bundlr balance won't be affected
