
import { ArweaveSigner } from 'arbundles';
import { createData } from 'arbundles/file/createData'

import { Config } from '.';
import { statSync, readFileSync } from 'fs';
import mime from 'mime-types';

export default class Uploader {
    private API;
    private config: Config;

    constructor(API, config: Config) {
        this.API = API;
        this.config = config;
    }

    public async upload(path) {
        try {
            if (!statSync(path)) {
                throw new Error(`Unable to access path: ${path}`);
            }
            const signer = new ArweaveSigner(this.config.wallet);
            let mimeType = mime.lookup(path);
            const tags = [{ name: "Content-Type", value: mimeType }]
            let dataItem = await createData(readFileSync(path), signer, { tags });
            await dataItem.sign(signer);
            const { protocol, host, port } = this.API.config;
            const res = await dataItem.sendToBundler(`${protocol}://${host}:${port}`);
            return res;

        } catch (err) {
            throw new Error(`error whilst sending: ${err}`);
        }
    }
}

