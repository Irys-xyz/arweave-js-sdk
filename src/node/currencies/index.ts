import BigNumber from "bignumber.js";
import { NodeCurrency } from "../types";
import ArweaveConfig from "./arweave";
import ERC20Config from "./erc20";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";
import AlgorandConfig from "./algorand";

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
