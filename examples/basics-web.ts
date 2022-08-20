import { WebBundlr } from '@bundlr-network/client/build/web';

import WalletConnectProvider from "@walletconnect/web3-provider";
import { providers } from "ethers";
import * as nearAPI from "near-api-js";
import { WalletConnection } from "near-api-js";
const { keyStores, connect } = nearAPI;
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

// this example gives example initialisation functions for each supported injected provider type

export async function MetaMask(c: {
    chainId: number;
    rpcUrls: string[];
    chainName: string;
}) {
    if (!window?.ethereum?.isMetaMask) return;
    await window.ethereum.enable();
    const provider = new providers.Web3Provider(window.ethereum);
    const chainId = `0x${c.chainId.toString(16)}`;
    try { // additional logic for requesting a chain switch and conditional chain add.
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }],
        });
    } catch (e: any) {
        if (e.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId, rpcUrls: c.rpcUrls, chainName: c.chainName
                }],
            });
        }
    }
    return provider;
}


export async function WalletConnect(c: any) {
    const enabledProvider = await (new WalletConnectProvider(c)).enable();
    return new providers.Web3Provider(enabledProvider);
}

export async function Phantom(c: any) {
    if (window.solana.isPhantom) {
        await window.solana.connect();
        const p = new PhantomWalletAdapter();
        await p.connect();
        return p;
    }
}

export async function near() {
    const config = {
        networkId: "mainnet",
        keyStore: new keyStores.BrowserLocalStorageKeyStore(),
        nodeUrl: "https://rpc.mainnet.near.org",
        walletUrl: "https://wallet.mainnet.near.org",
        helperUrl: "https://helper.mainnet.near.org",
        explorerUrl: "https://explorer.mainnet.near.org",
        headers: {
            "key": "value" // the type requires headers, but they aren't required for the code the demo app uses anyway.
        }
    };
    const near = await connect(config);
    const wallet = new WalletConnection(near, "bundlr");
    if (!wallet.isSignedIn()) {
        // redirection to authorise application
        window.setTimeout(() => { wallet.requestSignIn(); }, 4000);
    }
    else if (!await config.keyStore.getKey(wallet._networkId, wallet.getAccountId())) {
        // redirect to authorise key creation
    }
    return wallet;
}

// MetaMask config for supported chains
const currencyMap = {
    "matic": {
        chainId: 137,
        chainName: 'Polygon Mainnet',
        rpcUrls: ["https://polygon-rpc.com"],
    },
    "arbitrum": {
        chainName: "Arbitrum One",
        chainId: 42161,
        rpcUrls: ["https://arb1.arbitrum.io/rpc"]

    },
    "bnb": {
        chainName: "Binance Smart Chain",
        chainId: 56,
        rpcUrls: ["https://bsc-dataseed.binance.org/"]

    },
    "avalanche": {
        chainName: "Avalanche Network",
        chainId: 43114,
        rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"]
    },
    "boba-eth": {
        chainName: "BOBA L2",
        chainId: 288,
        rpcUrls: ["https://mainnet.boba.network"]

    },
    "boba": {
        chainName: "BOBA L2",
        chainId: 288,
        rpcUrls: ["https://mainnet.boba.network"]
    },
};


// pass it into webBundlr

async function initBundlr(provider: any, currency: string) {
    const bundlr = new WebBundlr("https://node1.bundlr.network", currency, provider);
    await bundlr.ready();
    return bundlr;
}