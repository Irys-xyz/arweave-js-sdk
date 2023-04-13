import type { Currency } from "../common/types";

import type * as arbundles from "arbundles/web";

export type WebArbundles = typeof arbundles;

export interface WebCurrency extends Currency {
  getPublicKey(): Promise<string | Buffer>;
  ready(): Promise<void>;
  inheritsRPC: boolean;
}
