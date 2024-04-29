import type { PrivyInterface } from "@privy-io/react-auth";
import type BaseWebToken from "../tokens/base";
export async function augmentTokenPrivy(tokenConfig: BaseWebToken, opts: any): Promise<void> {
  if (!opts.sendTransaction)
    throw new Error("missing required sendTransaction function - add sendTransaction from the usePrivy hook to the wallet object");
  const sendTransaction = opts.sendTransaction as PrivyInterface["sendTransaction"];

  tokenConfig.sendTx = async (data): Promise<string> =>
    sendTransaction({
      ...data,
      gasLimit: data.gasLimit.toHexString(),
      maxFeePerGas: data.maxFeePerGas.toHexString(),
      maxPriorityFeePerGas: data.maxPriorityFeePerGas.toHexString(),
    }).then((r) => r.transactionHash);
}
