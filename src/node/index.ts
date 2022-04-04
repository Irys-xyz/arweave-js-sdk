export { default } from "./bundlr"
export { default as NodeBundlr } from "./bundlr"

// on demand injection.
export const currencies: Array<[string, Array<string>]> = [
    ["@bundlr-network/ethereum", ["ethereum", "matic", "bnb", "fantom", "avalanche", "boba-eth", "arbitrum"]],
    ["@bundlr-network/arweave", ["arweave"]],
    ["@bundlr-network/erc20", ["boba", "chainlink", "kyve"]],
    ["@bundlr-network/algorand", ["algorand"]],
    ["@bundlr-network/near", ["near"]],
    ["@bundlr-network/solana", ["solana"]]
]
// @ts-ignore
globalThis.Bundlr?.currencyArrayMap ? (globalThis.Bundlr.currencyArrayMap.concat(currencies)) : (globalThis.Bundlr = { currencyArrayMap: currencies })