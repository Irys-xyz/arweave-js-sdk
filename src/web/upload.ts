import Uploader from "../common/upload";
import type WebBundlr from "./bundlr";
import type { Manifest, UploadResponse } from "../common/types";
import type { DataItem, JWKInterface, Tag } from "arbundles";
import { ArweaveSigner } from "arbundles";

export class WebUploader extends Uploader {
  protected bundlr: WebBundlr;
  constructor(bundlr: WebBundlr) {
    super(bundlr.api, bundlr.utils, bundlr.currency, bundlr.currencyConfig);
    this.bundlr = bundlr;
  }

  public async uploadFolder(
    files: File[],
    opts?: {
      indexFileRelPath?: string;
      manifestTags?: Tag[];
    },
  ): Promise<(UploadResponse & { ephemeralKey: JWKInterface; txs: string[]; ephemeralAddress: string; manifest: Manifest }) | undefined> {
    const txs: DataItem[] = [];
    const txMap = new Map();
    const ephemeralKey = await this.bundlr.arbundles.getCryptoDriver().generateJWK();
    const ephemeralSigner = new ArweaveSigner(ephemeralKey);
    for (const file of files) {
      const path = file.webkitRelativePath;
      const tx = this.bundlr.arbundles.createData(Buffer.from(await file.arrayBuffer()), ephemeralSigner, {
        tags: [{ name: "Content-Type", value: file.type }],
      });
      await tx.sign(ephemeralSigner);
      txs.push(tx);
      txMap.set(path, tx.id);
    }
    // generate manifest, add to bundle
    const manifest = await this.generateManifest({ items: txMap, indexFile: opts?.indexFileRelPath });
    const manifestTx = this.bundlr.arbundles.createData(JSON.stringify(manifest), ephemeralSigner, {
      tags: [
        { name: "Type", value: "manifest" },
        { name: "Content-Type", value: "application/x.arweave-manifest+json" },
        ...(opts?.manifestTags ?? []),
      ],
    });
    await manifestTx.sign(ephemeralSigner);
    txs.push(manifestTx);
    // upload bundle
    const bundleRes = await this.uploadBundle(txs, { ephemeralKey });

    return { ...bundleRes, id: manifestTx.id, manifest };
  }
}
