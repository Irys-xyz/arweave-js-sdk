export { default } from "./bundlr"
export { default as NodeBundlr } from "./bundlr"
// export * from "./currencies/index"

// on demand injection.
export const currencies: Array<[string, Array<string>]> = [
    ["@bundlr-network/ethereum-node", ["ethereum", "matic", "bnb", "fantom", "avalanche", "boba-eth", "arbitrum"]],
    ["@bundlr-network/arweave-node", ["arweave"]],
    ["@bundlr-network/erc20-node", ["boba", "chainlink", "kyve"]],
    ["@bundlr-network/algorand-node", ["algorand"]],
    ["@bundlr-network/near-node", ["near"]],
    ["@bundlr-network/solana-node", ["solana"]]
]
// @ts-ignore
globalThis.Bundlr?.currencyArrayMap ? (globalThis.Bundlr.currencyArrayMap.concat(currencies)) : (globalThis.Bundlr = { currencyArrayMap: currencies })

// import { currencyArrayMap } from "../common/index"
// currencyArrayMap.concat(currencies)
