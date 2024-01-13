import BaseNodeIrys from "../base";
import EthereumConfig from "../tokens/ethereum";
import type { NodeIrysConfig } from "../types";

export class EthereumIrys extends BaseNodeIrys {
  constructor({ url, key, config }: NodeIrysConfig<string>) {
    super({
      url,
      config,
      getTokenConfig: (irys) =>
        new EthereumConfig({
          irys,
          name: "ethereum",
          ticker: "ETH",
          providerUrl: config?.providerUrl ?? "https://cloudflare-eth.com/",
          wallet: key,
          opts: config?.tokenOpts,
        }),
    });
  }
}
