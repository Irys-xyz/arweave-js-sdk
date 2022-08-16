import * as p from "path";
import { promises } from "fs";
import PromisePool from "@supercharge/promise-pool/dist";
import Axios from "axios";
import assert from "assert";

export async function checkManifest(path) {
    path = p.resolve(path);
    const basePath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-`);
    const manifestID = (await promises.readFile(`${basePath}id.txt`)).toString();
    console.log(`validating manifest with ID ${manifestID}`);
    const files: string[] = [];
    for await (const f of walk(path)) {
        files.push(f);
    }
    const results = await PromisePool
        .for(files)
        .withConcurrency(200)
        .process(async (ip, i) => {
            if (i % 50 === 0) {
                console.log(`Processed ${i} entries`);
            }
            const f1 = await promises.readFile(ip);
            const f2 = await Axios.get(`https://arweave.net/${manifestID}/${p.relative(path, ip)}`, { responseType: "arraybuffer", responseEncoding: "binary" });

            const result = Buffer.compare(f2.data, f1);
            if (result != 0) {
                throw new Error(`${ip}:${result}`);
            }
            return result;

        });
    console.log(results);
    if (results.errors.length > 0) {
        console.log("Errors detected");
        results.errors.forEach(e => {
            console.log(e.stack ?? e.message ?? JSON.stringify(e));
        });
    }

}


export async function checkManifestBundlr(path: string, nodeURL: string) {
    path = p.resolve(path);
    const basePath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-`);
    const manifestID = (await promises.readFile(`${basePath}id.txt`)).toString();
    console.log(`validating manifest with ID ${manifestID}`);
    const files: string[] = [];
    for await (const f of walk(path)) {
        files.push(f);
    }
    const manifest = JSON.parse(await promises.readFile(`${basePath}manifest.json`, "utf-8"));
    console.log(manifest);
    const results = await PromisePool
        .for(files)
        .withConcurrency(200)
        .process(async (ip, i) => {
            if (i % 50 === 0) {
                console.log(`Processed ${i} entries`);
            }
            const f1 = await promises.readFile(ip);
            const { id } = manifest.paths?.[p.relative(path, ip)];
            const f2 = await Axios.get(`${nodeURL}/tx/${id}/data`, { responseType: "arraybuffer", responseEncoding: "binary" });
            const result = Buffer.compare(f2.data, f1);
            if (result != 0) {
                throw {
                    id,
                    ip,
                    result
                };
            }
            return result;
        });
    console.log(results);
    if (results.errors.length > 0) {
        console.log("Errors detected");
        results.errors.forEach(e => {
            console.log(e.stack ?? e.message ?? JSON.stringify(e));
        });
    }
    return results;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function* walk(dir: string) {
    for await (const d of await promises.opendir(dir)) {
        const entry = p.join(dir, d.name);
        if (d.isDirectory()) yield* await walk(entry);
        else if (d.isFile()) yield entry;
    }
}

if (require.main === module) {
    checkManifest("./testFolder");
}