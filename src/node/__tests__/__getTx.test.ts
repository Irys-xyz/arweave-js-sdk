import { clientKeys } from "../../../tests/utils";
import Bundlr from "../bundlr";

const transactionIds = {
  arweave: "zmYY3VGOWqqRN2zA_GdaD4vx0Br7Zj1nXVo3ZvcKKbg",
  ethereum: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
};
const BUNDLR_URL = "https://devnet.bundlr.network/";

const currencies = Object.keys(transactionIds);
jest.setTimeout(20000);
describe("bundlr.currencyConfig.getTx", () => {
  describe.each(currencies)("given we use %s", (keyName) => {
    let bundlr: Bundlr;
    beforeAll(async () => {
      const { key, providerUrl } = clientKeys[keyName];
      bundlr = new Bundlr(BUNDLR_URL, keyName, key, { providerUrl });
      await bundlr.ready();
    });

    describe("bundlr.currencyConfig.getTx", () => {
      it("should return the transaction", async () => {
        const tx = await bundlr.currencyConfig.getTx(transactionIds[keyName]);
        expect(tx).toBeDefined();
      });
    });
  });
});
