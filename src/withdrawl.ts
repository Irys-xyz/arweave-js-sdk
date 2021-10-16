import arweave from "arweave";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils";
import { AxiosResponse } from 'axios';
//import { jwkTopem } from "arweave/node/lib/crypto/pem";

interface data {
    publicKey: string,
    currency: string,
    amount: number,
    nonce: number,
    signature: Uint8Array
}



export async function withdrawBalance(amount): Promise<AxiosResponse<any>> {
    //const address = await this.Utils.getAddress();

    //const balance = await this.Utils.getBalance(address);
    //console.log(`balance: ${balance?.data.balance}`);
    //const bunBalance = (await this.Utils.getBalance("OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs")).data.balance;
    //console.log(`bunBalance: ${bunBalance}`);

    // for RSA: jwkTopem({ kty: jwk.kty, n: jwk.n, e: jwk.e });
    const JWK = this.config.wallet;
    const publicKey: string = JWK.n
    //todo: make util functions directly return data rather than having to post-return mutate
    let data = await { publicKey, currency: "arweave", amount, nonce: await this.utils.getNonce() } as data;
    let deephash = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    data.signature = await arweave.crypto.sign(JWK, deephash);


    //console.log(JSON.stringify(data));
    // let dh2 = await deepHash([stringToBuffer(data.currency), stringToBuffer(data.amount.toString()), stringToBuffer(data.nonce.toString())]);
    // let isValid = await arweave.crypto.verify(data.publicKey, dh2, data.signature);
    // console.log(isValid);
    //let res = await axios.post(`http://${bundler}/account/withdraw`, data);

    return this.API.post("/account/withdraw", data);
}