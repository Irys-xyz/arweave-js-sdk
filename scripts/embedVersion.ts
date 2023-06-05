import { resolve } from "path";
import { readFileSync } from "fs";
import Irys from "../src/common/irys";
import { readFile, writeFile } from "fs/promises";
import { checkPath } from "./genData";
const version = JSON.parse(readFileSync("./package.json", { encoding: "utf-8" })).version;
const paths = ["./bundle.js", "./bundle.js.map", "./cjs/common/irys.js", "./esm/common/irys.js"];
(async function (): Promise<void> {
  const dir = resolve("./build");
  await Promise.all(
    paths.map((p) =>
      (async (): Promise<void> => {
        const path = resolve(dir, p);
        if (!(await checkPath(path))) return console.log(`Skipping ${path} (ENOENT)`);
        const content = await readFile(path, { encoding: "utf-8" });
        const newContent = content.replace(Irys.VERSION, version);
        await writeFile(path, newContent, { encoding: "utf-8" });
      })(),
    ),
  );
})();
