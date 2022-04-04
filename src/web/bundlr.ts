// import { BundlrConfig } from "common/types";
import Api from "../common/api";
import Bundlr from "../common/bundlr";
import Fund from "../common/fund";
import Uploader from "../common/upload";
import Utils from "../common/utils";
// import EthereumConfig from "./currencies/ethereum";
// import NearConfig from "./currencies/near";
// import SolanaConfig from "./currencies/solana";
import { WebCurrency } from "./types";

export default class WebBundlr extends Bundlr {
    public currencyConfig: WebCurrency;
    constructor(url: string, currency: WebCurrency, config?: { timeout?: number, providerUrl?: string }) {
        super();
        const parsed = new URL(url);
        this.api = new Api({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: config?.timeout ?? 100000 });
        // eslint-disable-next-line @typescript-eslint/no-var-requires

        this.currencyConfig = currency
        this.currency = this.currencyConfig.name
        this.utils = new Utils(this.api, this.currency, this.currencyConfig);
        this.uploader = new Uploader(this.api, this.utils, this.currency, this.currencyConfig);
        // this.funder = new WebFund(this.utils);
        this.funder = new Fund(this.utils)
    }

    // async initialisation 
    public async ready(): Promise<void> {
        if (this.currencyConfig.ready) {
            await this.currencyConfig.ready()
        }
        this.address = this.currencyConfig.address
    }

    // static newBundlr(url: string, currency: string, wallet: any, config?: BundlrConfig): WebBundlr {
    //     const cConfig = getCurrency(currency, wallet, config?.providerUrl, config?.contractAddress)
    //     return new WebBundlr(url, cConfig, config)
    // }
}

// export function getCurrency(currency: string, wallet: any, providerUrl?: string, contractAddress?: string): WebCurrency {
//     switch (currency) {
//         case "ethereum":
//             return new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
//         case "matic":
//             return new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: providerUrl ?? "https://polygon-rpc.com", wallet })
//         case "arbitrum":
//             return new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet })
//         case "bnb":
//             return new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org", wallet })
//         case "avalanche":
//             return new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet })
//         case "boba":
//             return new EthereumConfig({ name: "boba", ticker: "ETH", providerUrl: providerUrl ?? "https://mainnet.boba.network/", wallet })
//         case "solana":
//             return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
//         // case "algorand":
//         //     return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
//         case "near":
//             return new NearConfig({ name: "near", ticker: "NEAR", providerUrl: providerUrl ?? "https://rpc.mainnet.near.org", wallet })
//         default:
//             throw new Error(`Unknown/Unsupported currency ${currency}`);
//     }
// }
