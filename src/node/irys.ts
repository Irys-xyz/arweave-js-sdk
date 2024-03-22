import type { IrysConfig, Network } from "../common/types";
import { BaseNodeIrys } from "./base";
import getTokenConfig from "./tokens";

export class NodeIrys extends BaseNodeIrys {
  /**
   * Constructs a new Irys instance, as well as supporting subclasses
   * @param url - URL to the bundler
   * @param key - private key (in whatever form required)
   */
  constructor({ url, token, network, key, config }: { url?: string; network?: Network; token: string; key?: any; config?: IrysConfig }) {
    super({
      url,
      config,
      network,
      getTokenConfig: (irys) => {
        return getTokenConfig(
          irys,
          token.toLowerCase(),
          key,
          irys.api.getConfig().url.toString(),
          config?.providerUrl,
          config?.contractAddress,
          config?.tokenOpts,
        );
      },
    });
  }

  public static async init(opts: {
    url: string;
    token: string;
    privateKey?: string;
    publicKey?: string;
    signingFunction?: (msg: Uint8Array) => Promise<Uint8Array>;
    collectSignatures?: (msg: Uint8Array) => Promise<{ signatures: string[]; bitmap: number[] }>;
    providerUrl?: string;
    timeout?: number;
    contractAddress?: string;
  }): Promise<NodeIrys> {
    const { url, token, privateKey, publicKey, signingFunction, collectSignatures, providerUrl, timeout, contractAddress } = opts;
    const Irys = new NodeIrys({
      url,
      token,
      key: signingFunction ? publicKey : privateKey,
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
export default NodeIrys;
