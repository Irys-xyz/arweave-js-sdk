import { AxiosResponse } from "axios";
import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Utils from "../common/utils";
import NodeUploader from "./upload";

let currencies;
export const keys: { [key: string]: { key: any, address: string } } = {};

export default class NodeBundlr extends Bundlr {
    public uploader: NodeUploader; //re-define type
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - JWK in JSON
     */
    constructor(url: string, currency: string, wallet?: any) {
        super();
        // hacky for the moment...
        // specifically about ordering - some stuff here seems silly but leave it for now it works

        this.currency = currency;
        if (!wallet) {
            wallet = "default";
        }
        keys[currency] = { key: wallet, address: undefined };
        this.wallet = wallet;
        const parsed = new URL(url);
        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname });

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        currencies = (require("./currencies/index")).currencies; //delay so that keys object can be properly constructed
        if (!currencies[currency]) {
            throw new Error(`Unknown/Unsuported currency ${currency}`);
        }

        this.currencyConfig = currencies[currency];
        this.currencyConfig.account.address = this.address;

        if (!(wallet === "default")) {
            const address = this.currencyConfig.ownerToAddress(this.currencyConfig.getPublicKey());
            this.address = address;
            this.currencyConfig.account.address = address;
        }


        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.funder = new Fund(this.utils);
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

