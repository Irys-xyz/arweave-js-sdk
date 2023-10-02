
![](https://github.com/Bundlr-Network/js-sdk/blob/master/assets/irys-SDK.png?raw=true)

# Irys SDK

Ferociously fast, super scalable, simply seamless.

Permanent data with strong provenance in only three lines of code with the Irys SDK.

## How Irys works

When you upload data to Irys, you are immediately issued a receipt. This [receipt](https://docs.irys.xyz/learn/receipts) contains a transaction ID that can be used to instantly download your data, along with a timestamp documenting the exact millisecond at which the transaction was uploaded and verified. It also acts as a cryptographic proof of time and can be verified at any moment as a safeguard against potentially malicious behavior.

With high throughput capacity and instant timestamping, Irys is able to provide [strong provenance](http://docs.irys.xyz/learn/strong-provenance) at any [scale](http://docs.irys.xyz/learn/volumetric-scaling).

For more details, including a video overview, [see our docs](http://docs.irys.xyz/overview/about).

## Why Irys offers
- Volumetric scaling: Can [handle millions of transactions per second](https://youtu.be/JKEivHKDXAo) and [limitless data volumes](http://docs.irys.xyz/learn/volumetric-scaling).
- Instant uploads: Upload data to Irys in as little as 8ms.
- Frictionless integration: [3-4 lines of code](http://docs.irys.xyz/developer-docs/irys-sdk) to integrate Irys.
- Pay in any token: Sign and pay to use Irys in [14 supported tokens](http://docs.irys.xyz/overview/supported-tokens).

## Integrating Irys is frictionless

See our [docs for full code examples](http://docs.irys.xyz/developer-docs/irys-sdk) showing how to upload data, a file and a folder of files.

```js
const irys = new Irys({ url, token, key });
const fundTx = await irys.fund(irys.utils.toAtomic(0.05));
const receipt = await irys.uploadFile("./myImage.png");
```

## Irys in the browser

When using [Irys in the browser](http://docs.irys.xyz/developer-docs/irys-sdk/irys-in-the-browser), the end user's injected provider is used to sign transactions and pay for uploads. See our docs for [copy and paste code examples](http://docs.irys.xyz/developer-docs/irys-sdk/irys-in-the-browser). 

## UI toolkit

To help kickstart your next project, we've released the [Provenance Toolkit](http://docs.irys.xyz/developer-docs/provenance-toolkit), a full suite of open source UI components.

## Video

We also have a [video](https://www.youtube.com/watch?v=eGFYxJPaEjg) teaching how to build with Irys.

## Support

If you have any questions or just want to brainstorm about how to integrate Irys into your project, hit us up in [Discord](https://discord.irys.xyz).