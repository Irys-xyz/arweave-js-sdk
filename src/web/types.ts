import type { Currency } from "../common/types";

export interface WebCurrency extends Currency {
  getPublicKey(): Promise<string | Buffer>;
  ready(): Promise<void>;
}
