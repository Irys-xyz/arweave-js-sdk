import type Basetoken from "../token";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";
import ERC20Config from "./erc20";
import axios from "axios";
import utils from "../../common/utils";
import AptosConfig from "./aptos";
import type WebIrys from "../irys";
import { EthereumEthersV5 } from "../providers/ethereum/ethersv5";
import { EthereumEthersV6 } from "../providers/ethereum/ethersv6";
import type { TokenConfig } from "src/common/types";
import type BaseWebToken from "../token";
import ArweaveConfig from "./arweave";

export default function getTokenConfig({
  irys,
  token,
  wallet,
  providerUrl,
  contractAddress,
  providerName,
}: {
  irys: WebIrys;
  token: string;
  wallet: any;
  providerUrl?: string;
  contractAddress?: string;
  providerName?: string;
}): Basetoken {
  switch (token) {
    case "ethereum":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "ethereum",
        ticker: "ETH",
        providerUrl: providerUrl ?? "https://cloudflare-eth.com/",
        wallet: wallet,
      });
    case "matic":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "matic",
        ticker: "MATIC",
        providerUrl: providerUrl ?? "https://polygon-rpc.com",
        wallet: wallet,
        minConfirm: 1,
      });
    case "arbitrum":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "arbitrum",
        ticker: "ETH",
        providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc",
        wallet: wallet,
      });
    case "bnb":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "bnb",
        ticker: "BNB",
        providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org",
        wallet: wallet,
      });
    case "avalanche":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "avalanche",
        ticker: "AVAX",
        providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc",
        wallet: wallet,
      });
    case "boba-eth":
      return resolveProvider("ethereum", providerName, {
        irys: irys,
        name: "boba-eth",
        ticker: "ETH",
        providerUrl: providerUrl ?? "https://mainnet.boba.network/",
        minConfirm: 1,
        wallet: wallet,
      });
    case "boba": {
      const k = new ERC20Config({
        irys: irys,
        name: "boba",
        ticker: "BOBA",
        providerUrl: providerUrl ?? "https://mainnet.boba.network/",
        contractAddress: contractAddress ?? "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7",
        minConfirm: 1,
        wallet: wallet,
      });
      // for L1 mainnet: "https://main-light.eth.linkpool.io/" and "0x42bbfa2e77757c645eeaad1655e0911a7553efbc"
      k.price = async (): Promise<number> => {
        const res = await axios.post("https://api.livecoinwatch.com/coins/single", JSON.stringify({ currency: "USD", code: `${k.ticker}` }), {
          headers: { "x-api-key": "75a7a824-6577-45e6-ad86-511d590c7cc8", "content-type": "application/json" },
        });
        await utils.checkAndThrow(res, "Getting price data");
        if (!res?.data?.rate) {
          throw new Error(`unable to get price for ${k.name}`);
        }
        return +res.data.rate;
      };
      return k;
    }

    case "solana":
      return new SolanaConfig({
        irys: irys,
        name: "solana",
        ticker: "SOL",
        providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/",
        wallet: wallet,
      });
    // case "algorand":
    //     return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet: wallet })
    case "near":
      return new NearConfig({
        irys: irys,
        name: "near",
        ticker: "NEAR",
        providerUrl: providerUrl ?? "https://rpc.mainnet.near.org",
        wallet: wallet,
      });
    case "aptos":
      return new AptosConfig({
        irys: irys,
        name: "aptos",
        ticker: "APTOS",
        providerUrl: providerUrl ?? "https://fullnode.mainnet.aptoslabs.com/v1",
        wallet: wallet,
      });
    case "arweave":
      return new ArweaveConfig({
        irys: irys,
        name: "arweave",
        ticker: "AR",
        providerUrl: providerUrl ?? "https://arweave.net",
        wallet: wallet,
      });
    case "base-eth":
      return new EthereumConfig({
        irys: irys,
        name: "base-eth",
        ticker: "ETH",
        providerUrl: providerUrl ?? "https://mainnet.base.org/",
        minConfirm: 2,
        wallet: wallet,
      });

    case "usdc-eth":
      return new ERC20Config({
        irys: irys,
        name: "usdc-eth",
        ticker: "USDC",
        providerUrl: providerUrl ?? "https://cloudflare-eth.com/",
        contractAddress: contractAddress ?? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        wallet,
      });
    default:
      throw new Error(`Unknown/Unsupported token ${token}`);
  }
}

// @ts-expect-error todo fix
function resolveProvider(family: string, providerName: string | undefined, config: TokenConfig): BaseWebToken {
  switch (family) {
    case "ethereum":
      switch (providerName) {
        case "ethersv5":
          return new EthereumEthersV5(config);
        case "ethersv6":
          return new EthereumEthersV6(config);
        default:
          return new EthereumConfig(config);
      }
  }
}
