const fs = require('fs/promises');
const path = require("path");

//script for renaming .js to .mjs, as well as .d.ts to .d.mts as required.



async function* readdirP(dir: string): AsyncGenerator<string> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            for await (const sub of readdirP(path.join(dir, entry.name))) {
                yield sub;
            }
        } else if (entry.isFile()) {
            yield path.join(dir, entry.name);
        }
    }
}

async function main(): Promise<void> {
    return;
    const p = path.resolve(process.cwd());
    console.log("path", p);
    for await (const entry of readdirP(p)) {
        const match = /^(.*)(\.(js|js\.map|d\.ts))$/.exec(entry);
        if (match == null) {
            continue;
        }
        const file = match[1];
        const ext = match[2];
        if (ext === '.js') {
            let data = await fs.readFile(entry, 'utf-8');
            data = data.replace(/^((import|export)\s+.+from\s+')(.+)('\s*)/gm, (_, prefix: string, __, file: string, suffix: string) => {
                if (file.startsWith('./') && !file.endsWith('.mjs')) {
                    file += '.mjs';
                }
                return `${prefix}${file}${suffix}`;
            });
            data = data.replace(`//# sourceMappingURL=${path.basename(file)}.js.map`, `//# sourceMappingURL=${path.basename(file)}.mjs.map`);
            await fs.writeFile(entry, data);
            await fs.rename(entry, `${file}.mjs`);
        } else if (ext === '.js.map') {
            const data = JSON.parse(await fs.readFile(entry, 'utf-8'));
            data.file = `${file}.mjs`;
            await fs.writeFile(entry, JSON.stringify(data));
            await fs.rename(entry, `${file}.mjs.map`);
        } else if (ext === '.d.ts') {
            await fs.rename(entry, `${file}.d.mts`);
        }
    }
}

main()
    .catch((e: Error) => {
        console.error(e);
        process.exit(1);
    });