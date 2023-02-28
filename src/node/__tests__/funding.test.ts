import Bundlr from "../bundlr";
import {clientKeys} from "../../keys";

jest.setTimeout(40000);
// for each currency to test, include here the precalculated public key
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BUNDLR_DEVNET_URL = "https://devnet.bundlr.network/";


async function handleConfirmation(_currency: string){
    // do some stuff to make sure the transaction is confirmed
    // this is specific for each currency and needs to be implemented
}

describe("given we some devnet wallets", () => {
    const currenciesToTestAgainst = Object.keys(clientKeys["devnet"]);
    const currencyConfigs = clientKeys["devnet"];

    describe.each(currenciesToTestAgainst)("and given we have a %s Bundlr wallet", (currencyName) => {
        const testBalance = 13;
        const currencyConfig: {
            key: string,
            provider: string;
        } = currencyConfigs[currencyName];
        let bundlr : Bundlr;

        beforeEach(async () => {
            bundlr = new Bundlr(BUNDLR_DEVNET_URL, currencyName, currencyConfig.key, { providerUrl: currencyConfig.provider });
            await bundlr.ready();
        });

        describe("and we want to fund the node", () => {
            it("should succeed", async () => {
                const fundResponse = await bundlr.fund(testBalance, 1);
                expect(fundResponse).toBeDefined();
            });
            it("should have all the required response fields", async () => {
                const fundResponse = await bundlr.fund(testBalance, 1);
                expect(fundResponse.reward).toBeDefined();
                expect(fundResponse.target).toBeDefined();
                expect(fundResponse.quantity).toBe(testBalance.toString());
                expect(fundResponse.id).toBeDefined();
            });

            it("should fund the node correctly", async () => {
                const balanceBefore = await bundlr.getLoadedBalance();
                const fundResponse = await bundlr.fund(testBalance, 1);
                expect(fundResponse).toBeDefined();

                await handleConfirmation(currencyName);
                const balanceAfter = await bundlr.getLoadedBalance();
                expect(balanceAfter).toEqual(balanceBefore.plus(testBalance));

            });
            it("the fund method should put the correct amount onto the chain", async () => {
                const fundResponse = await bundlr.fund(testBalance, 1);
                expect(fundResponse).toBeDefined();

                await handleConfirmation(currencyName);
                const transactionDetails = await bundlr.currencyConfig.getTx(fundResponse.id);
                expect(transactionDetails).toBeDefined();
                expect(transactionDetails.amount.isEqualTo(testBalance)).toBeTruthy();
            });
        });

    });
});