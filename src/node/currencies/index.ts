import BigNumber from "bignumber.js";
import { NodeCurrency } from "../types";
import ArweaveConfig from "./arweave";
import ERC20Config from "./erc20";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";
import AlgorandConfig from "./algorand";
import NodeBundlr from "../bundlr";
/**
 * For more dynamic usecases
 * WARNING: this cripples tree shaking, use at your own risk!
 * @param currency 
 * @param wallet 
 * @param providerUrl 
 * @param contractAddress 
 * @returns 
 */
export default function getCurrency(currency: string, wallet: any, providerUrl?: string, contractAddress?: string): NodeCurrency {
    switch (currency) {
        case "arweave":
            return new ArweaveConfig({ name: "arweave", ticker: "AR", minConfirm: 10, providerUrl: providerUrl ?? "arweave.net", wallet, isSlow: true })
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", minConfirm: 8, providerUrl: providerUrl ?? "https://morning-hidden-forest.matic.quiknode.pro/2864d4b10b348d1e7799cea5cbab433418741098/", wallet })
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org/", wallet })
        case "fantom":
            return new EthereumConfig({ name: "fantom", ticker: "FTM", providerUrl: providerUrl ?? "https://rpc.ftm.tools/", wallet })
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl ?? "https://api.avax-test.network/ext/bc/C/rpc/", wallet })
        case "boba":
            return new EthereumConfig({ name: "boba", ticker: "ETH", providerUrl: providerUrl ?? "https://mainnet.boba.network/", wallet })
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc/", wallet })
        case "chainlink":
            return new ERC20Config({ name: "chainlink", ticker: "LINK", providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", contractAddress: contractAddress ?? "0x514910771AF9Ca656af840dff83E8264EcF986CA", wallet })
        case "kyve": {
            const k = new ERC20Config({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: providerUrl ?? "https://moonbeam-alpha.api.onfinality.io/public", contractAddress: contractAddress ?? "0x3cf97096ccdb7c3a1d741973e351cb97a2ede2c1", isSlow: true, wallet })
            k.price = async (): Promise<number> => { return 100 } // TODO: replace for mainnet
            k.getGas = async (): Promise<[BigNumber, number]> => { return [new BigNumber(100), 1e18] }
            return k; // TODO: ensure units above are right
        }
        case "near": {
            return new NearConfig({ name: "near", ticker: "NEAR", providerUrl: providerUrl ?? "https://rpc.mainnet.near.org", wallet })
        }
        case "algorand": {
            return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://algoexplorerapi.io", wallet })
        }
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}

// Named Bundlr "flavours"
export class ArweaveBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new ArweaveConfig({ name: "arweave", ticker: "AR", minConfirm: 10, providerUrl: config?.providerUrl ?? "arweave.net", wallet, isSlow: true })
        super(url, "arweave", currencyConfig, config)
    }
}

export class EthereumBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
        super(url, "ethereum", currencyConfig, config)
    }
}

export class MaticBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "matic", ticker: "MATIC", minConfirm: 8, providerUrl: config?.providerUrl ?? "https://morning-hidden-forest.matic.quiknode.pro/2864d4b10b348d1e7799cea5cbab433418741098/", wallet })
        super(url, "matic", currencyConfig, config)
    }
}

export class BNBBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: config?.providerUrl ?? "https://bsc-dataseed.binance.org/", wallet })
        super(url, "bnb", currencyConfig, config)
    }
}

export class FantomBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "fantom", ticker: "FTM", providerUrl: config?.providerUrl ?? "https://rpc.ftm.tools/", wallet })
        super(url, "fantom", currencyConfig, config)
    }
}

export class SolanaBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: config?.providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        super(url, "solana", currencyConfig, config)
    }
}

export class AvalancheBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: config?.providerUrl ?? "https://api.avax-test.network/ext/bc/C/rpc/", wallet })
        super(url, "avalanche", currencyConfig, config)
    }
}

export class BobaBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "boba", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://mainnet.boba.network/", wallet })
        super(url, "boba", currencyConfig, config)
    }
}

export class ArbitrumBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: config?.providerUrl ?? "https://arb1.arbitrum.io/rpc/", wallet })
        super(url, "arbitrum", currencyConfig, config)
    }
}

export class ChainlinkBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new ERC20Config({ name: "chainlink", ticker: "LINK", providerUrl: config?.providerUrl ?? "https://main-light.eth.linkpool.io/", contractAddress: config?.contractAddress ?? "0x514910771AF9Ca656af840dff83E8264EcF986CA", wallet })
        super(url, "chainlink", currencyConfig, config)
    }
}

export class KyveBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new ERC20Config({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: config?.providerUrl ?? "https://moonbeam-alpha.api.onfinality.io/public", contractAddress: config?.contractAddress ?? "0x3cf97096ccdb7c3a1d741973e351cb97a2ede2c1", isSlow: true, wallet })
        currencyConfig.price = async (): Promise<number> => { return 100 } // TODO: replace for mainnet
        currencyConfig.getGas = async (): Promise<[BigNumber, number]> => { return [new BigNumber(100), 1e18] }
        super(url, "kyve", currencyConfig, config)
    }
}

export class NearBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new NearConfig({ name: "near", ticker: "NEAR", providerUrl: config?.providerUrl ?? "https://rpc.mainnet.near.org", wallet })
        super(url, "near", currencyConfig, config)
    }
}

export class AlograndBundlr extends NodeBundlr {
    constructor(url: string, wallet?: any, config?: { timeout?: number, providerUrl?: string, contractAddress?: string }) {
        const currencyConfig = new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: config?.providerUrl ?? "https://algoexplorerapi.io", wallet })
        super(url, "algorand", currencyConfig, config)
    }
}