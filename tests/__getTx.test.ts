import { clientKeys } from "./utils";
import Irys from "../src/node/irys";

const transactionIds = {
  arweave: "zmYY3VGOWqqRN2zA_GdaD4vx0Br7Zj1nXVo3ZvcKKbg",
  ethereum: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
};
const Irys_URL = "https://devnet.Irys.network/";

const currencies = Object.keys(transactionIds);
jest.setTimeout(20000);
describe("Irys.tokenConfig.getTx", () => {
  describe.each(currencies)("given we use %s", (keyName) => {
    let Irys: Irys;
    beforeAll(async () => {
      const { key, providerUrl } = clientKeys[keyName];
      Irys = new Irys(Irys_URL, keyName, key, { providerUrl });
      await Irys.ready();
    });

    describe("Irys.tokenConfig.getTx", () => {
      it("should return the transaction", async () => {
        const tx = await Irys.tokenConfig.getTx(transactionIds[keyName]);
        expect(tx).toBeDefined();
      });
    });
  });
});
