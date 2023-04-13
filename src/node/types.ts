import type { Currency } from "../common/types";
import type * as arbundles from "arbundles";

export type Arbundles = typeof arbundles;
export interface NodeCurrency extends Currency {
  getPublicKey(): string | Buffer;
}
