import { Currency } from "../../common/types";
import ArweaveConfig from "./arweave";
import EthereumConfig from "./ethereum";
import SolanaConfig from "./solana";




export default function getCurrency(currency: string, wallet: any): Currency {
    switch (currency) {
        case "arweave":
            return new ArweaveConfig({ name: "arweave", ticker: "AR", minConfirm: 5, wallet })
        // case "ethereum":
        //     return new EthereumConfig({ name: "ethereum", ticker: "ETH", minConfirm: 5, wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", provider: "https://polygon-rpc.com", minConfirm: 5, wallet })
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", minConfirm: 5, provider: "https://bsc-dataseed.binance.org", wallet })
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", minConfirm: 5, wallet })
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}


