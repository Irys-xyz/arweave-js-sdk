import { NodeCurrency } from "../types";
import ArweaveConfig from "./arweave";
import ERC20Config from "./erc20";
import EthereumConfig from "./ethereum";
import SolanaConfig from "./solana";

export default function getCurrency(currency: string, wallet: any, providerUrl?: string, contractAddress?: string): NodeCurrency {
    switch (currency) {
        case "arweave":
            return new ArweaveConfig({ name: "arweave", ticker: "AR", minConfirm: 5, providerUrl: providerUrl ?? "arweave.net", wallet })
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: providerUrl ?? "https://polygon-rpc.com", minConfirm: 5, wallet })
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", minConfirm: 5, providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org", wallet })
        case "fantom":
            return new EthereumConfig({ name: "fantom", ticker: "FTM", minConfirm: 5, providerUrl: providerUrl ?? "https://rpc.ftm.tools/", wallet })
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", minConfirm: 5, providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com", wallet })
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", minConfirm: 5, providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet })
        case "boba":
            return new EthereumConfig({ name: "boba", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl ?? "https://mainnet.boba.network/", wallet })
        case "chainlink":
            return new ERC20Config({ name: "chainlink", ticker: "LINK", minConfirm: 5, providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", contractAddress: contractAddress ?? "0x514910771AF9Ca656af840dff83E8264EcF986CA", wallet })
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet })
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
