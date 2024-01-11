import { BaseWebIrys } from "./base";
import type { IrysConfig } from "../common/types";
import getTokenConfig from "./tokens";

export class WebIrys extends BaseWebIrys {
  constructor({
    url,
    token,
    wallet,
    config,
  }: {
    url: "node1" | "node2" | "devnet" | string;
    token: string;
    wallet?: { rpcUrl?: string; name?: string; provider: object };
    config?: IrysConfig;
  }) {
    super({
      url,
      wallet,
      config,
      getTokenConfig: (irys) =>
        getTokenConfig({
          irys,
          token: token.toLowerCase(),
          wallet: wallet?.provider ?? wallet,
          providerUrl: config?.providerUrl ?? wallet?.rpcUrl,
          contractAddress: config?.contractAddress,
          providerName: wallet?.name,
        }),
    });
  }
}
export default WebIrys;
