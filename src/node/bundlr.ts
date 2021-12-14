import { AxiosResponse } from "axios";
import Bundlr from "../common/bundlr";
import NodeUploader from "./upload";
// import Api from "arweave/node/lib/api";



export default class NodeBundlr extends Bundlr {
    public uploader: NodeUploader; //re-define type
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - JWK in JSON
     */
    constructor(url: string, currency: string, wallet?: any) {
        super(url, currency, wallet);
        this.uploader = new NodeUploader(this.api, currency, this.currencyConfig)
    }

    /**
     * Upload a file at the specified path to the bundler
     * @param path path to the file to upload
     * @returns bundler response
     */
    async uploadFile(path: string): Promise<AxiosResponse<any>> {
        return this.uploader.uploadFile(path);
    };

}
