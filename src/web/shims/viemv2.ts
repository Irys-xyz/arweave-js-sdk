/* eslint-disable @typescript-eslint/explicit-function-return-type */
import BigNumber from "bignumber.js";
import type { http } from "viem";
import type { PublicClient, WalletClient } from "viem";
import type { mainnet } from "viem/chains";
import type { Tx } from "src/common/types";
import type EthereumConfig from "../tokens/ethereum";
import type ERC20Config from "../tokens/erc20";

// TODO: figure out a better way to do this.
export async function augmentViemV2(tokenConfig: EthereumConfig, opts: any): Promise<void> {
  const walletClient = opts.provider as WalletClient;
  const publicClient = opts.publicClient as PublicClient<ReturnType<typeof http>, typeof mainnet>;

  tokenConfig.ready = async function () {
    await this.getSigner().ready();
    this._address = await walletClient.getAddresses().then((r) => r[0].toString().toLowerCase());
    this.providerInstance = this.wallet;
  }.bind(tokenConfig);

  tokenConfig.getFee = async (_amount) => new BigNumber(0);
  opts.provider.getSigner = () => ({
    getAddress: async () => walletClient.getAddresses().then((r) => r[0]),
    _signTypedData: async (domain, types, message): Promise<string> => {
      message["Transaction hash"] = "0x" + Buffer.from(message["Transaction hash"]).toString("hex");
      return await walletClient.signTypedData({ account: message.address, domain, types, primaryType: "Bundlr", message });
    },
  });
  tokenConfig.getCurrentHeight = async () => new BigNumber((await publicClient.getBlockNumber()).toString());

  // if this is ERC20
  if ((tokenConfig as ERC20Config).contractAddress) {
    throw new Error("viemv2 is not supported for ERC20 tokens");
  } else {
    // this is a full chain
    tokenConfig.getTx = async (txId): Promise<Tx> => {
      const tx = await publicClient.getTransaction({ hash: txId as `0x${string}` });
      const currentHeight = await publicClient.getBlockNumber();
      return {
        to: tx.to!,
        from: tx.from,
        blockHeight: new BigNumber(tx.blockNumber.toString()),
        amount: new BigNumber(tx.value.toString()),
        pending: tx.blockNumber ? false : true,
        confirmed: currentHeight - tx.blockNumber >= tokenConfig.minConfirm,
      };
    };

    tokenConfig.createTx = async function (amount, to) {
      const config = {
        account: tokenConfig.address,
        to,
        value: amount.toString(),
      };

      return {
        txId: undefined,
        tx: config,
      };
    }.bind(tokenConfig);

    tokenConfig.sendTx = async function (data: { account: `0x${string}`; to: `0x${string}`; value: bigint }): Promise<string> {
      return await walletClient.sendTransaction({ account: data.account, to: data.to, value: data.value, chain: walletClient.chain });
    };
  }
}
