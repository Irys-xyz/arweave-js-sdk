import * as fs from "fs"
import { PathLike } from "fs"
import Crypto from "crypto"

export const checkPath = async (path: PathLike): Promise<boolean> => { return fs.promises.stat(path).then(_ => true).catch(_ => false) }

function randomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function genData(path: string, number: number, minSize: number, maxSize: number) {
    if (!await checkPath(path)) {
        fs.mkdirSync(path);
    }
    for (let i = 0; i < number; i++) {
        await fs.promises.writeFile(`${path}/${i}.json`, Crypto.randomBytes(randomNumber(minSize, maxSize)).toString("base64"))
        if (i % 10 == 0) {
            console.log(i);
        }
    }
    console.log("done")
}


async function t1() {
    await genData("./testFolder", 1_000, 10_000, 100_000)
}

t1();