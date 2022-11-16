import { stringToBuffer } from "arweave/node/lib/utils";
import { DataItem } from "./DataItem";
import { isBrowser } from "./utils";
import { deepHash } from "./deepHash";


export async function getSignatureData(item: DataItem): Promise<Uint8Array> {
    if (isBrowser()) {
        //@ts-ignore
        const web = await import("arweave/web/lib/deepHash");
        //@ts-ignore
        return web.default([
            stringToBuffer("dataitem"),
            stringToBuffer("1"),
            stringToBuffer(item.signatureType.toString()),
            item.rawOwner,
            item.rawTarget,
            item.rawAnchor,
            item.rawTags,
            item.rawData,
        ]);
    } else {
        return deepHash([
            stringToBuffer("dataitem"),
            stringToBuffer("1"),
            stringToBuffer(item.signatureType.toString()),
            item.rawOwner,
            item.rawTarget,
            item.rawAnchor,
            item.rawTags,
            item.rawData,
        ]);
    }
}
