//used for route testing
import { config } from "dotenv";
import axios from "axios";
import arweave from "arweave";
import fs from "fs";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils.js";
import { jwkTopem } from "arweave/node/lib/crypto/pem.js";



config();
const bundler = process.env.TEST_HOST;
const jwk = JSON.parse(fs.readFileSync(process.env.PATH_TO_JWK).toString());
let Arweave = new arweave({});


/**
 * get the address, amount, currency and nonce
 * put into object, create subarray of amount currency and nonce (in that order if order matters)
 * DeepHash subarray, place signature into object
 * send object to bundler http://bundler.arweave.net/withdraw
 * ???
 * profit
 */

async function getNonce(address) {
    return 1;
    let res = await axios.get(`http://${bundler}/withdrawls?address=${walletAddress}`).catch(e => console.log(`Error getting nonce: ${e}`));
    return res++;
}

async function requestWithdrawl(jwk, bundler, currency, amount) {
    const address = new arweave({}).wallets.jwkToAddress(jwk);
    // for RSA: jwkTopem({ kty: jwk.kty, n: jwk.n, e: jwk.e });
    const publicKey = jwk.n;
    let data = { publicKey, currency, amount, nonce: await getNonce(address), signature: "" }
    data.signature = await arweave.crypto.sign(jwk, await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount), stringToBuffer(data.nonce)]));
    //let res = await axios.post(`https://${bundler}/withdrawl`, data);
    return data;
}

async function validateWithdrawl(data) {
    const address = await new arweave({}).wallets.ownerToAddress(data.publicKey);
    let isValid = await arweave.crypto.verify(data.publicKey, await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount), stringToBuffer(data.nonce)]), data.signature);
    return isValid;
}

async function test() {
    let data = await requestWithdrawl(jwk, bundler, "arweave", 10);
    data.amount = 100;
    let validWithdrawl = await validateWithdrawl(data);
    console.log(validWithdrawl); //should be false
}
test();


