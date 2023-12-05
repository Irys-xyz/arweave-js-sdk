import type { IrysConfig, Token } from "../common/types";
export interface NodeToken extends Token {
  getPublicKey(): string | Buffer;
}

export type NodeIrysConfig<Key = any> = {
  url: "node1" | "node2" | "devnet" | string;
  key: Key;
  config?: IrysConfig;
};
