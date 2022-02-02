import BaseCurrency from "../currency";
import EthereumConfig from "./ethereum";
import SolanaConfig from "./solana";
// import PolkadotConfig from "./polkadot";

export default function getCurrency(currency: string, wallet: any, providerUrl?: string): BaseCurrency {
    switch (currency) {
        // case "ethereum":
        //     return new EthereumConfig({ name: "ethereum", ticker: "ETH", minConfirm: 5, wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: providerUrl ?? "https://polygon-rpc.com", minConfirm: 5, wallet })
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet })
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", minConfirm: 5, providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org", wallet })
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", minConfirm: 5, providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet })
        case "boba":
            return new EthereumConfig({ name: "boba", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl ?? "https://mainnet.boba.network/", wallet })
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", minConfirm: 5, wallet })
        // case "polkadot":
        //     return new PolkadotConfig({ name: "polkadot", ticker: "DOT", providerUrl: providerUrl ?? "wss://rpc.polkadot.io", minConfirm: 5, wallet })
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}


