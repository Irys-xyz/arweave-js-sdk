import EthereumConfig from "../../tokens/ethereum";
import type { Web3Provider } from "ethersv5";

export class EthereumEthersV5 extends EthereumConfig {
  public declare wallet: Web3Provider;
}
