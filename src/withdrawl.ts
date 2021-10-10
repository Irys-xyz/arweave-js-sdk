import { config } from "dotenv";
import axios from "axios";
import arweave from "arweave";
import fs from "fs";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
//import { jwkTopem } from "arweave/node/lib/crypto/pem";
import { JWKInterface } from "arweave/node/lib/wallet";


interface data {
    publicKey: string,
    currency: string,
    amount: number,
    nonce: number,
    signature: Uint8Array
}

config();
const bundler: string = process.env.TEST_HOST;
const jwk: JWKInterface = JSON.parse(fs.readFileSync(process.env.PATH_TO_JWK).toString());
//let Arweave: arweave = new arweave({});

export async function getNonce(address): Promise<number> {
    let res = await axios.get(`http://${bundler}/account/withdrawls?address=${address}`);
    return res.data++;
}

export async function requestWithdrawl(jwk, bundler, currency, amount) {
    const address: string = await new arweave({}).wallets.jwkToAddress(jwk);
    // for RSA: jwkTopem({ kty: jwk.kty, n: jwk.n, e: jwk.e });
    const publicKey: string = jwk.n;
    const balance = await axios.get(`http://${bundler}/account/balance?address=${address}`);
    console.log(`balance: ${balance?.data.balance}`);
    const bunBalance = await axios.get(`http://${bundler}/account/balance?address=OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs`);
    console.log(`bunBalance: ${bunBalance?.data.balance}`);
    let data = await { publicKey, currency, amount, nonce: await getNonce(address) } as data;

    let dh1 = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    data.signature = await arweave.crypto.sign(jwk, dh1);


    console.log(JSON.stringify(data));
    // let dh2 = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);

    // let isValid = await arweave.crypto.verify(data.publicKey, dh2, data.signature);
    // console.log(isValid);
    //return;
    let res = await axios.post(`http://${bundler}/account/withdraw`, data);

    return res;
}

requestWithdrawl(jwk, bundler, "arweave", 1000).then(v => {
    console.log(v);
}).catch(e => {
    console.log(e);
})