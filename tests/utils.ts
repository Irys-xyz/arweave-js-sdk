import { readFileSync } from "fs";

export const clientKeys = JSON.parse(readFileSync(process.env.CLIENT_KEYS_PATH ?? "./wallet.json", "utf-8"))