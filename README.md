# JS Client

Official JavaScript implementation of [the Bundlr client](https://docs.bundlr.network/).

## Docs

Full documentation [here](https://docs.bundlr.network/developer-docs/sdk)


## Installation

Install using npm:

```console
npm install @bundlr-network/client
```

or yarn:

```console
yarn add @bundlr-network/client
```

## Permanently upload data in 3 steps

1. Connect to a node

```js
const polygonPrivateKey = "6d779d4..."; // your private key
const bundlr = new Bundlr("http://node1.bundlr.network", "matic", polygonPrivateKey);
```

2. Fund the node using any of our [supported tokens](https://docs.bundlr.network/overview/supported-tokens)

```js
const polygonPrivateKey = "6d779d4..."; // your private key
const bundlr = new Bundlr("http://node1.bundlr.network", "matic", polygonPrivateKey);
```

3. Upload data

```js
const dataToUpload = "GM world.";
const response = await bundlr.upload(dataToUpload);
```

4. Instantly download your data

```js
console.log(`Data Available at => https://arweave.net/${response.id}`);
```

## Devnet

When building projects, use our [Devnet](https://docs.bundlr.network/developer-docs/using-devnet) where uploads are paid for with free tokens including [Mumbai](https://mumbaifaucet.com/) and [Sepolia](sepoliafaucet). 

## Bundlr in the browser

When connecting to Bundlr from the browser, use the `WebBundlr` class to connect to a node using the end user's injected provider. 


When using ethers 5, use this code. For [other providers, see our docs](https://docs.bundlr.network/developer-docs/sdk/bundlr-in-the-browser). 

```js
import { WebBundlr } from "@bundlr-network/client";
import { providers } from "ethers";
 
await window.ethereum.enable();
const provider = new providers.Web3Provider(window.ethereum);
const bundlr = new WebBundlr("https://node1.bundlr.network", "matic", provider);
await bundlr.ready();
```

## Provenance toolkit

The easiest way to get started using Bundlr in the browser is to fork the [Bundlr Provenance Toolkit](https://docs.bundlr.network/developer-docs/provenance-toolkit), a collection of UI components to kickstart your next project. 

It contains UI components for managing node balances, uploading files, performing gassless uploads, and querying transactions.

## Support

Any questions? 
- Check out our [docs](https://docs.bundlr.network/)
- Hit us up in [Discord](https://discord.bundlr.network/)
  