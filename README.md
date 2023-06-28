# JS Client


## Install The SDK

Install using npm

```console
npm install @irys-network/client
```

or yarn

```console
yarn add @irys-network/client
```

TODO: Update install instructions once final

## Import The SDK

```js
import Irys from "@irys/client";
```

TODO: I'm getting some wonky behavior with imports. When I use `import Irys from "@irys/client";` Intellisense in VSCode works, but I'm not able to connect to a node. When I change the import to `import Irys from "@irys/client/node";` Intellisense no longer works, but I am able to connect to a node and use Irys functions. Flagging it here in the README / docs to make sure I return to this later. 

## Connect To A node

Connect [to any of our three nodes](TODO), using a serialized JWK file when using an Arweave wallet

```js
const getIrysArweave = async () => {
	const url = "https://devnet.bundlr.network";
	const providerUrl = "https://rpc-mumbai.maticvigil.com";
	const currency = "arweave";
	const wallet = JSON.parse(fs.readFileSync("arweaveWallet.json").toString());

	const irys = new Irys({
		url: url, // URL of the node you want to connect to
		currency: currency, // Currency used for payment and signing
		key: wallet, // Arweave wallet
		config: { providerUrl: providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
};
```

Or a private key when using an EVM or Solana wallet

```js
const getIrys = async () => {
	const url = "https://devnet.bundlr.network";
	const providerUrl = "https://rpc-mumbai.maticvigil.com";
	const currency = "matic";

	const irys = new Irys({
		url: url, // URL of the node you want to connect to
		currency: currency, // Currency used for payment and signing
		key: process.env.ETH_PRIVATE_KEY, // ETH or SOL private key
		config: { providerUrl: providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
};
```

## Fund A Node

Fund a node using any of our [supported tokens](TODO).

```js
const fundNode = async () => {
	const irys = await getIrys();
	const fundTx = await irys.fund(irys.utils.toAtomic(0.05));

	console.log(`Successfully funded ${irys.utils.fromAtomic(fundTx.quantity)} ${irys.currency}`);
};
```

## Uploading 📤

Irys supports two types of uploads for permanent and immutable storage. Regular permanent storage, and permanent storage plus strong provenance. Strong provenance uploads include a cryptographically signed receipt that verifies the exact time of the transaction, precise to the millisecond. 

### Permanent Storage Only

If your application does not require receipts, use the functions:

- `irys.upload()` To upload any data
- `irys.uploadFile()` To upload a file
- `irys.uploadFolder()` To upload a folder

#### Upload Data

```js
const uploadData = async () => {
	const irys = await getIrys();
	const dataToUpload = "GM world.";
	try {
		const response = await irys.upload(dataToUpload);
		console.log(`Data uploaded ==> https://arweave.net/${response.id}`);
	} catch (e) {
		console.log("Error uploading data ", e);
	}
};
```

#### Upload A File

```js
const uploadFile = async () => {
	const irys = await getIrys();
	// Your file
	const fileToUpload = "./myImage.png";

	// Add a custom tag that tells the gateway how to serve this file to a browser
	const tags = [{ name: "Content-Type", value: "image/png" }];

	try {
		const response = await irys.uploadFile(fileToUpload, tags);
		console.log(`File uploaded ==> https://arweave.net/${response.id}`);
	} catch (e) {
		console.log("Error uploading file ", e);
	}
};
```

#### Upload A Folder

When [uploading a folder](TODO), files can be accessed either directly at `https://arweave.net/[transaction-id]` or `https://arweave.net/[manifest-id]/[file-name]`

```js
const uploadFolder = async () => {
	const irys = await getIrys();

	// Upload an entire folder
	const folderToUpload = "./my-images/"; // Path to folder
	try {
		const response = await irys.uploadFolder("./" + folderToUpload, {
			indexFile: "", // optional index file (file the user will load when accessing the manifest)
			batchSize: 50, //number of items to upload at once
			keepDeleted: false, // whether to keep now deleted items from previous uploads
		}); //returns the manifest ID

		console.log(`Files uploaded. Manifest Id ${response.id}`);
	} catch (e) {
		console.log("Error uploading file ", e);
	}
};
```

### Permanent Storage Plus Strong Provenance

If your application requires strong provenance, use the functions:

- `irys.provenance.upload()` To upload any data
- `irys.provenance.uploadFile()` To upload a file
- `irys.provenance.uploadFolder()` To upload a folder

#### Upload Data

```js
TODO
```

#### Upload A File

```js
TODO
```

#### Upload A Folder

When [uploading a folder](TODO), files can be accessed either directly at `https://arweave.net/[transaction-id]` or `https://arweave.net/[manifest-id]/[file-name]`

```js
TODO
```