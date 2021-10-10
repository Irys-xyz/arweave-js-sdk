import { JWKInterface } from "arweave/node/lib/wallet";
import { config } from "dotenv";
import { Url } from "url";
import { readFileSync } from "fs";

config();
export const bundler: string = process.env.TEST_HOST;
export const jwk: JWKInterface = JSON.parse(readFileSync(process.env.PATH_TO_JWK).toString());