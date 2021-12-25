import { Currency } from "../types"
import EthereumConfig from "./ethereum";

export default function getCurrency(currency: string, wallet: any): Currency {
    switch (currency) {
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", minConfirm: 5, wallet })
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", provider: "https://polygon-rpc.com", minConfirm: 5, wallet })
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}


