import type { Signer } from "arbundles";
import type BigNumber from "bignumber.js";
import type { Tx, TokenConfig } from "../../common/types";
import axios from "axios";
import type { NodeToken } from "../types";
import utils from "../../common/utils";
import type Utils from "../../common/utils";
import type BaseNodeIrys from "../base";
export abstract class BaseNodeToken implements NodeToken {
  public base!: [string, number];
  protected wallet: any;
  protected _address: string | undefined;
  protected providerUrl: any;
  protected providerInstance?: any;
  public ticker!: string;
  public name!: string;
  protected minConfirm = 5;
  public isSlow = false;
  public needsFee = true;
  protected opts?: any;
  protected utils!: Utils;
  public irys!: BaseNodeIrys;

  constructor(config: TokenConfig) {
    Object.assign(this, config);
    this._address = this.wallet ? this.ownerToAddress(this.getPublicKey()) : undefined;
  }

  // common methods

  get address(): string | undefined {
    return this._address;
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
  abstract getFee(_amount: BigNumber.Value, _to?: string, _multiplier?: BigNumber.Value): Promise<BigNumber | object>;
  abstract sendTx(_data: any): Promise<string | undefined>;
  abstract createTx(_amount: BigNumber.Value, _to: string, _fee?: string | object): Promise<{ txId: string | undefined; tx: any }>;
  abstract getPublicKey(): string | Buffer;
}

export async function getRedstonePrice(token: string): Promise<number> {
  const res = await axios.get(`https://api.redstone.finance/prices?symbol=${token}&provider=redstone&limit=1`);
  await utils.checkAndThrow(res, "Getting price data");
  return res.data[0].value;
}
