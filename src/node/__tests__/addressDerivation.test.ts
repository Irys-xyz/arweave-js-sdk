import Bundlr from "../bundlr";
import keys from "../../keys"; // change this to your keyfile

const BUNDLR_DEVNET_URL = "https://devnet.bundlr.network/";

jest.setTimeout(20000);

// for each currency to test, include here the precalculated public key
const publicKeys = {
    "arweave": "PErog3nOS28sektQy5p-zJ4zDk4g2hfsHh85RGOOrco",
    "ethereum": "04f446c3897dbf19753b6050c2a06201aa55a59c185d3dd04c0746b32c8992540bd95c9966b07458739248d2919c125f2c1d422cb7743245c58c50ce9b5a03fb0e",
    "solana": "350efd4780e5cd4b9c0d45709f7c48e93a3d31a1fa77a3f57c2bd8096688c243",
    "algorand": "5d2c5fdf0721ed58e663610d7aef09ad47e9eef07a0d071594ec08e77b0cd542",
    "near": keys.near.address,
    "aptos": keys.aptos.address
};



const hexEncodedCurrencies = ["ethereum", "aptos"];

describe.each(Object.keys(publicKeys))("given we use %s", (keyName) => {
    let bundlr: Bundlr;

    beforeAll(async () => {
        const { key, providerUrl } = keys[keyName];
        bundlr = new Bundlr(BUNDLR_DEVNET_URL, keyName, key, providerUrl ?? { providerUrl });
        await bundlr.ready();
    });

    describe("bundlr.currencyConfig.getPublicKey", () => {
        it("should return the public key", () => {
            const publicKey = bundlr.currencyConfig.getPublicKey();
            expect(publicKey.toString("hex")).toBe(publicKeys[keyName]);
        });
    });

    describe("bundlr.currencyConfig.ownerToAddress", () => {
        it("should return the address", () => {
            const publicKey = bundlr.currencyConfig.getPublicKey();
            const address = bundlr.currencyConfig.ownerToAddress(publicKey);

            // aptos and ethereum addresses are hex and thus case insensitive
            if (hexEncodedCurrencies.includes(keyName))
                expect(address.toLowerCase()).toBe(keys[keyName].address.toLowerCase());
            else
                expect(address).toBe(keys[keyName].address);
        });
    });
});


