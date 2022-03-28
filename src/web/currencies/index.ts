import WebBundlr from "../bundlr";
import BaseCurrency from "../currency";
// import AlgorandConfig from "./algorand";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";

export default function getCurrency(currency: string, wallet: any, providerUrl?: string, contractAddress?: string): BaseCurrency {
    switch (currency) {
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: providerUrl ?? "https://polygon-rpc.com", wallet })
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet })
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org", wallet })
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet })
        case "boba":
            return new EthereumConfig({ name: "boba", ticker: "ETH", providerUrl: providerUrl ?? "https://mainnet.boba.network/", wallet })
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        // case "algorand":
        //     return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        case "near":
            return new NearConfig({ name: "near", ticker: "NEAR", providerUrl: providerUrl ?? "https://rpc.mainnet.near.org", wallet })
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
export class EthereumBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
        super(url, currencyConfig, config)
    }
}

export class MaticBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: config?.providerUrl ?? "https://polygon-rpc.com", wallet })
        super(url, currencyConfig, config)
    }
}

export class ArbitrumBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet })
        super(url, currencyConfig, config)
    }
}

export class BNBBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: config?.providerUrl ?? "https://bsc-dataseed.binance.org", wallet })
        super(url, currencyConfig, config)
    }
}

export class AvalancheBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: config?.providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet })
        super(url, currencyConfig, config)
    }
}

export class BobaBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "boba", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://mainnet.boba.network/", wallet })
        super(url, currencyConfig, config)
    }
}

export class SolanaBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: config?.providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        super(url, currencyConfig, config)
    }
}

export class NearBundlr extends WebBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new NearConfig({ name: "near", ticker: "NEAR", providerUrl: config?.providerUrl ?? "https://rpc.mainnet.near.org", wallet })
        super(url, currencyConfig, config)
    }
}


