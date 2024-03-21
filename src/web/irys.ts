import { BaseWebIrys } from "./base";
import type { IrysConfig, Network } from "../common/types";
import getTokenConfig from "./tokens";

export class WebIrys extends BaseWebIrys {
  constructor({
    url,
    network,
    token,
    wallet,
    config,
  }: {
    url?: string;
    network?: Network;
    token: string;
    wallet?: { rpcUrl?: string; name?: string; provider: object; [key: string]: any };
    config?: IrysConfig;
  }) {
    super({
      url,
      wallet,
      config,
      network,
      getTokenConfig: (irys) =>
        getTokenConfig({
          irys,
          token: token.toLowerCase(),
          wallet: wallet?.provider ?? wallet,
          providerUrl: config?.providerUrl ?? wallet?.rpcUrl,
          contractAddress: config?.contractAddress,
          providerName: wallet?.name,
          tokenOpts: { ...config?.tokenOpts, ...wallet },
        }),
    });
  }

  public static async init(opts: {
    url: string;
    token: string;
    provider?: string;
    publicKey?: string;
    signingFunction?: (msg: Uint8Array) => Promise<Uint8Array>;
    collectSignatures?: (msg: Uint8Array) => Promise<{ signatures: string[]; bitmap: number[] }>;
    providerUrl?: string;
    timeout?: number;
    contractAddress?: string;
  }): Promise<WebIrys> {
    const { url, token, provider, publicKey, signingFunction, collectSignatures, providerUrl, timeout, contractAddress } = opts;
    const Irys = new WebIrys({
      url,
      token,
      // @ts-expect-error types
      wallet: { name: "init", provider: signingFunction ? publicKey : provider },
      config: {
        providerUrl,
        timeout,
        contractAddress,
        tokenOpts: { signingFunction, collectSignatures },
      },
    });
    await Irys.ready();
    return Irys;
  }
}
export default WebIrys;
