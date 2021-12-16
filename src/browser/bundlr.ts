import Bundlr from "../common/bundlr";
import Utils from "../common/utils";
import WebFund from "./fund";

export default class WebBundlr extends Bundlr {

    constructor(url: string, currency: string, provider?: any) {
        super(url, currency, provider);
        this.funder = new WebFund(this.utils);
    }

    //async initialisation 
    public async ready(): Promise<void> {
        console.log("webBundlr readied!")
        const pkey = await this.currencyConfig.getPublicKey();
        console.log(`pKey: ${JSON.stringify(pkey)}`)
        const address = this.currencyConfig.ownerToAddress(pkey);
        this.address = address;
        this.currencyConfig.account.address = address

        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
    }
}
