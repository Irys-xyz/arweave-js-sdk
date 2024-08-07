/* eslint-disable no-case-declarations */
import type Basetoken from "./base";
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
import type { TokenConfig } from "../../common/types";
import type BaseWebToken from "./base";
import ArweaveConfig from "./arweave";
import { augmentTokenPrivy } from "../shims/privy";
import { augmentViemV2 } from "../shims/viemv2";
import { Network } from "@aptos-labs/ts-sdk";

export default function getTokenConfig({
  irys,
  token,
  wallet,
  providerUrl,
  contractAddress,
  providerName,
  tokenOpts: opts,
}: {
  irys: WebIrys;
  token: string;
  wallet: any;
  providerUrl?: string;
  contractAddress?: string;
  providerName?: string;
  tokenOpts?: any;
}): Basetoken {
  switch (token) {
    case "ethereum":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "ethereum",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://cloudflare-eth.com/",
          wallet: wallet,
          opts,
        },
      });
    case "matic":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "matic",
          ticker: "MATIC",
          providerUrl: providerUrl ?? "https://polygon-rpc.com",
          wallet: wallet,
          minConfirm: 1,
          opts,
        },
      });
    case "arbitrum":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "arbitrum",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc",
          wallet: wallet,
          opts,
        },
      });
    case "bnb":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "bnb",
          ticker: "BNB",
          providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org",
          wallet: wallet,
          opts,
        },
      });
    case "avalanche":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "avalanche",
          ticker: "AVAX",
          providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc",
          wallet: wallet,
          opts,
        },
      });
    case "boba-eth":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "boba-eth",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://mainnet.boba.network/",
          minConfirm: 1,
          wallet: wallet,
          opts,
        },
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
        opts,
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
        opts,
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
        opts,
      });
    case "aptos":
      return new AptosConfig({
        irys: irys,
        name: "aptos",
        ticker: "APTOS",
        providerUrl: providerUrl ?? Network.MAINNET,
        wallet: wallet,
        opts,
      });
    case "arweave":
      return new ArweaveConfig({
        irys: irys,
        name: "arweave",
        ticker: "AR",
        providerUrl: providerUrl ?? "https://arweave.net",
        wallet: wallet,
        opts,
      });
    case "base-eth":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "base-eth",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://mainnet.base.org/",
          minConfirm: 2,
          wallet: wallet,
          opts,
        },
      });

    case "usdc-eth":
      return new ERC20Config({
        irys: irys,
        name: "usdc-eth",
        ticker: "USDC",
        providerUrl: providerUrl ?? "https://cloudflare-eth.com/",
        contractAddress: contractAddress ?? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        wallet,
        opts,
      });

    case "usdc-polygon":
      return new ERC20Config({
        irys,
        name: "usdc-polygon",
        ticker: "USDC",
        providerUrl: providerUrl ?? "https://polygon-rpc.com",
        contractAddress: contractAddress ?? "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
        opts,
      });
    case "bera":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "bera",
          ticker: "BERA",
          // TODO: make sure this is set to mainnet
          providerUrl: providerUrl ?? "https://bartio.rpc.berachain.com/",
          wallet: wallet,
          opts,
        },
      });

    case "scroll-eth":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "scroll-eth",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://rpc.scroll.io",
          wallet: wallet,
          opts,
        },
      });
    case "linea-eth":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "linea-eth",
          ticker: "ETH",
          providerUrl: providerUrl ?? "https://rpc.linea.build",
          wallet: wallet,
          opts,
        },
      });
    case "iotex":
      return resolveProvider({
        family: "ethereum",
        providerName,
        config: {
          irys: irys,
          name: "iotex",
          ticker: "IOTX",
          providerUrl: providerUrl ?? "https://babel-api.mainnet.iotex.io/",
          wallet: wallet,
          opts,
        },
      });
    default:
      throw new Error(`Unknown/Unsupported token ${token}`);
  }
}

function resolveProvider({
  family,
  providerName,
  config,
}: {
  family: string;
  providerName: string | undefined;
  config: TokenConfig & { erc20?: boolean };
}): BaseWebToken {
  let cfg;
  switch (family) {
    case "ethereum":
      switch (providerName) {
        case "ethersv5":
          return new EthereumEthersV5(config);
        case "ethersv6":
          return new EthereumEthersV6(config);
        case "privy-embedded":
          cfg = new EthereumEthersV5(config);
          augmentTokenPrivy(cfg, config.opts);
          return cfg;
        case "viemv2":
          cfg = new EthereumConfig(config);
          augmentViemV2(cfg, config.opts);
          return cfg;
        default:
          return new EthereumConfig(config);
      }
    default:
      throw new Error(`Unknown token family ${family}`);
  }
}
