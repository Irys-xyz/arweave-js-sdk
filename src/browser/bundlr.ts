import Bundlr from "../common/bundlr";

export default class WebBundlr extends Bundlr {

    constructor(url: string, currency: string, provider?: any) {
        super(url, currency, provider);
    }

    //async initialisation 
    public async ready(): Promise<void> {
        console.log("webBundlr readied!")
        const pkey = await this.currencyConfig.getPublicKey();
        console.log(`pkey: ${pkey}`);
        this.address = this.currencyConfig.ownerToAddress(pkey);
    }
}
