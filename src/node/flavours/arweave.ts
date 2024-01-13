import type { JWKInterface } from "arbundles/node";
import BaseNodeIrys from "../base";
import ArweaveConfig from "../tokens/arweave";
import type { NodeIrysConfig } from "../types";

export class ArweaveIrys extends BaseNodeIrys {
  constructor({ url, key, config }: NodeIrysConfig<JWKInterface>) {
    super({
      url,
      config,
      getTokenConfig: (irys) =>
        new ArweaveConfig({
          irys,
          name: "arweave",
          ticker: "AR",
          minConfirm: 10,
          providerUrl: config?.providerUrl ?? "https://arweave.net",
          wallet: key,
          isSlow: true,
          opts: config?.tokenOpts,
        }),
    });
  }
}
