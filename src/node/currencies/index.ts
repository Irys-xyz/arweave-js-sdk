import BigNumber from "bignumber.js";
import { NodeCurrency } from "../types";
import ArweaveConfig from "./arweave";
import ERC20Config from "./erc20";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";
import AlgorandConfig from "./algorand";
import axios from "axios";
import utils from "../../common/utils";
import AptosConfig from "./aptos";
import MultiSignatureAptos from "./multiAptos";

export default function getCurrency(currency: string, wallet: any, url: string, providerUrl?: string, contractAddress?: string, opts?: any): NodeCurrency {
    switch (currency) {
        case "arweave":
            return new ArweaveConfig({ name: "arweave", ticker: "AR", minConfirm: 10, providerUrl: providerUrl ?? "https://arweave.net", wallet, isSlow: true, opts });
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl ?? "https://cloudflare-eth.com/", wallet, opts });
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", minConfirm: 1, providerUrl: providerUrl ?? "https://polygon-rpc.com/", wallet, opts });
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org/", wallet, opts });
        case "fantom":
            return new EthereumConfig({ name: "fantom", ticker: "FTM", providerUrl: providerUrl ?? "https://rpc.ftm.tools/", wallet, opts });
        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet, opts });
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl ?? "https://api.avax-test.network/ext/bc/C/rpc/", wallet, opts });
        case "boba-eth":
            return new EthereumConfig({ name: "boba-eth", ticker: "ETH", providerUrl: providerUrl ?? "https://mainnet.boba.network/", minConfirm: 1, wallet, opts });
        case "boba": {
            const k = new ERC20Config({ name: "boba", ticker: "BOBA", providerUrl: providerUrl ?? "https://mainnet.boba.network/", contractAddress: contractAddress ?? "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", minConfirm: 1, wallet, opts });
            // for L1 mainnet: "https://main-light.eth.linkpool.io/" and "0x42bbfa2e77757c645eeaad1655e0911a7553efbc"
            k.price = async (): Promise<number> => {
                const res = await axios.post("https://api.livecoinwatch.com/coins/single", JSON.stringify({ "currency": "USD", "code": `${k.ticker}` }), { headers: { "x-api-key": "75a7a824-6577-45e6-ad86-511d590c7cc8", "content-type": "application/json" } });
                await utils.checkAndThrow(res, "Getting price data");
                if (!res?.data?.rate) {
                    throw new Error(`unable to get price for ${k.name}`);
                }
                return +res.data.rate;
            };
            return k;
        }
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc/", wallet, opts });
        case "chainlink":
            return new ERC20Config({ name: "chainlink", ticker: "LINK", providerUrl: providerUrl ?? "https://main-light.eth.linkpool.io/", contractAddress: contractAddress ?? "0x514910771AF9Ca656af840dff83E8264EcF986CA", wallet, opts });
        case "kyve": {
            const k = new ERC20Config({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: providerUrl ?? "https://moonbeam-alpha.api.onfinality.io/public", contractAddress: contractAddress ?? "0x3cf97096ccdb7c3a1d741973e351cb97a2ede2c1", isSlow: true, wallet, opts });
            k.price = async (): Promise<number> => { return 100; }; // TODO: replace for mainnet
            k.getGas = async (): Promise<[BigNumber, number]> => { return [new BigNumber(100), 1e18]; };
            return k; // TODO: ensure units above are right
        }
        case "near": {
            return new NearConfig({ name: "near", ticker: "NEAR", providerUrl: providerUrl ?? "https://rpc.mainnet.near.org", wallet, bundlrUrl: url, opts });
        }
        case "algorand": {
            return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://algoexplorerapi.io", wallet, opts });
        }
        case "aptos": {
            return new AptosConfig({ name: "aptos", ticker: "APTOS", providerUrl: providerUrl ?? "https://fullnode.mainnet.aptoslabs.com", wallet, opts });
        }
        case "multiaptos": {
            return new MultiSignatureAptos({ name: "aptos", ticker: "APTOS", providerUrl: providerUrl ?? "https://fullnode.mainnet.aptoslabs.com/v1", wallet, opts });
        }
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
