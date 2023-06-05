import Irys from "../../node";

const receipt = {
  id: "DQQbx79jsgI4rGlhO0arqwEMWhqWUMFTdLbO1i8M-PA",
  timestamp: 1684069968790,
  version: "1.0.0" as const,
  public:
    "sq9JbppKLlAKtQwalfX5DagnGMlTirditXk7y4jgoeA7DEM0Z6cVPE5xMQ9kz_T9VppP6BFHtHyZCZODercEVWipzkr36tfQkR5EDGUQyLivdxUzbWgVkzw7D27PJEa4cd1Uy6r18rYLqERgbRvAZph5YJZmpSJk7r3MwnQquuktjvSpfCLFwSxP1w879-ss_JalM9ICzRi38henONio8gll6GV9-omrWwRMZer_15bspCK5txCwpY137nfKwKD5YBAuzxxcj424M7zlSHlsafBwaRwFbf8gHtW03iJER4lR4GxeY0WvnYaB3KDISHQp53a9nlbmiWO5WcHHYsR83OT2eJ0Pl3RWA-_imk_SNwGQTCjmA6tf_UVwL8HzYS2iyuu85b7iYK9ZQoh8nqbNC6qibICE4h9Fe3bN7AgitIe9XzCTOXDfMr4ahjC8kkqJ1z4zNAI6-Leei_Mgd8JtZh2vqFNZhXK0lSadFl_9Oh3AET7tUds2E7s-6zpRPd9oBZu6-kNuHDRJ6TQhZSwJ9ZO5HYsccb_G_1so72aXJymR9ggJgWr4J3bawAYYnqmvmzGklYOlE_5HVnMxf-UxpT7ztdsHbc9QEH6W2bzwxbpjTczEZs3JCCB3c-NewNHsj9PYM3b5tTlTNP9kNAwPZHWpt11t79LuNkNGt9LfOek",
  signature:
    "Iv0tSm55LEQjA7HH4LrlecRAhHf8O87eiby42HZLrpENdj88Hy-37tFqaOng-sfC0pTg8NF-74LBh2miYM7qvpuX1wDEPMY2ZXCHmzSgTUevtNvksN3g4AkJbobG2Jnj6zj_0arzLVYbm-MnUb-dRfinvMfLg3p2Bof1vp9dqdnwnm2nPAgTxy8tKuo4P-DalAmE1qwDegERWsHweiSXBwe4R9CAHszEUg0HZG8Obn9_ZZFLSGT8ozsziHahIvrldDSe0OVpT2X52zutb6BfSRs_NG8VSOE9IbU8QU6vFcInBVwNP6B-X63Shc6MB-SZXVD2sURjpqWVo4mcBc8J6csuebZhc0dfn7TuWu7AHguHQxYx4YrTPDZgHRsMMHGfMLJEGpwKhozVmMIDlW4ozOBqD_BaWn7nykoNpmUkTzxn_NypTry_bpp9EXb1FDfMc3RUJ4eZ-MbN3kCbViLxM5E5gsSjey7oa4J-PIrNKSHzgxj_oodzm-dibDZzBWIqbdDOm-xCKSDYtop1W0vzsb25CrMBNSqFGvi7EOGZyGz4YmFQxqe3waBAgWRfElbgtlMrMmqxh2_s17ke0vKru5J_UjH7eVJtatJWbFDI1XUYKsbYmiVBgEu97LNLhiohjU-EyP95g_EY0E-ulgZ0tolN7J5HKBEf1J-87EyUCtc",
  deadlineHeight: 1182671,
  block: 1182671,
  validatorSignatures: [],
};

const Irys = new Irys("https://node1.Irys.network", "ethereum", "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f");

describe("With a constant receipt", () => {
  it("should succeed", async () => {
    await expect(Irys.verifyReceipt(receipt)).resolves.toBe(true);
  });
  it("should fail", async () => {
    expect(Irys.utils.verifyReceipt({ ...receipt, signature: "test" })).resolves.toBe(false);
  });
});
describe("With an uploaded receipt", () => {
  it("Should retrieve and verify successfully", async () => {
    const receipt = await Irys.utils.getReceipt("DQQbx79jsgI4rGlhO0arqwEMWhqWUMFTdLbO1i8M-PA");
    await expect(receipt.verify()).resolves.toBe(true);
  });
});
