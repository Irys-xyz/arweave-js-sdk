import type { FileDataItem } from "arbundles/file";
import type { Signer } from "arbundles";
import { getCryptoDriver } from "../utils";
import base64url from "base64url";
import type BigNumber from "bignumber.js";
import type { Tx, TokenConfig } from "../../common/types";
import axios from "axios";
import type { WebToken } from "../types";
import utils from "../../common/utils";
import type { BaseWebIrys } from "../base";

export default abstract class BaseWebToken implements WebToken {
  public base!: [string, number];
  protected wallet: any;
  protected _address: string | undefined;
  protected providerUrl: any;
  protected providerInstance?: any;
  public ticker!: string;
  public name!: string;
  public irys!: BaseWebIrys;
  public config!: TokenConfig;
  protected opts?: any;
  public minConfirm = 5;
  public isSlow = false;
  public needsFee = true;
  public inheritsRPC = false;

  constructor(config: TokenConfig) {
    Object.assign(this, config);
    this.config = config;
  }

  // common methods

  get address(): string | undefined {
    return this._address;
  }

  public async ready(): Promise<void> {
    this._address = this.wallet ? this.ownerToAddress(await this.getPublicKey()) : undefined;
  }

  async getId(item: FileDataItem): Promise<string> {
    return base64url.encode(Buffer.from(await getCryptoDriver().hash(await item.rawSignature())));
  }
  async price(): Promise<number> {
    return getRedstonePrice(this.ticker);
  }
  abstract getTx(_txId: string): Promise<Tx>;
  abstract ownerToAddress(_owner: any): string;
  abstract sign(_data: Uint8Array): Promise<Uint8Array>;
  abstract getSigner(): Signer;
  abstract verify(_pub: any, _data: Uint8Array, _signature: Uint8Array): Promise<boolean>;
  abstract getCurrentHeight(): Promise<BigNumber>;
  abstract getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber | object>;
  abstract sendTx(_data: any): Promise<string | undefined>;
  abstract createTx(_amount: BigNumber.Value, _to: string, _fee?: any): Promise<{ txId: string | undefined; tx: any }>;
  abstract getPublicKey(): Promise<string | Buffer>;
}

export async function getRedstonePrice(token: string): Promise<number> {
  const res = await axios.get(`https://api.redstone.finance/prices?symbol=${token}&provider=redstone&limit=1`);
  await utils.checkAndThrow(res, "Getting price data");
  return res.data[0].value;
}
