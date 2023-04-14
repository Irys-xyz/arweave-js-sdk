import { resolve } from "path";
import { readFileSync } from "fs";
import Bundlr from "../src/common/bundlr";
import { readFile, writeFile } from "fs/promises";
import { checkPath } from "./genData";
const version = JSON.parse(readFileSync("./package.json", { encoding: "utf-8" })).version;
const paths = ["./bundle.js", "./bundle.js.map", "./cjs/common/bundlr.js", "./esm/common/bundlr.js"];
(async function (): Promise<void> {
  const dir = resolve("./build");
  await Promise.all(
    paths.map((p) =>
      (async (): Promise<void> => {
        const path = resolve(dir, p);
        if (!(await checkPath(path))) return console.log(`Skipping ${path} (ENOENT)`);
        const content = await readFile(path, { encoding: "utf-8" });
        const newContent = content.replace(Bundlr.VERSION, version);
        await writeFile(path, newContent, { encoding: "utf-8" });
      })(),
    ),
  );
})();
