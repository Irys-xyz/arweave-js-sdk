import secp256k1 from "secp256k1";
//@ts-ignore
import keccak256 from "./keccak256";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils.js";
import base64url from "base64url";
import { EnglishMnemonic, Secp256k1, Secp256k1Signature, sha256, ExtendedSecp256k1Signature, Slip10RawIndex, HdPath, Slip10Curve, stringToPath, Bip39, Slip10, } from "@cosmjs/crypto";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const main = async () => {

const sampleData = {
    "publicKey":"BJ0IWB4PZ5qWuEBPLEW8zWjjrz7L0po1iTu0WHQ_XbQednERMqSTzxZKkuH2s_3z9M204Ve0pV9UvQPLU8v9rT4",
    "currency":"cosmos",
    "amount":"1",
    "nonce":2,
    "signature":"JkjX2agtthEv1CuZSdOGRHsamermuk89L87DTpJss7I3hows-TDaVCbqdN8m4CYOFYPEmSrtHk8Qna61Pj8Q3Q",
      "sigType":5
}

const mnemonic = new EnglishMnemonic("moon spirit genius shrimp first language bird marble practice vocal maple radar");
const walletSeed = await Bip39.mnemonicToSeed(mnemonic);
// console.log(walletSeed);
const path = stringToPath("m/44'/118'/0'/0/0");
const slip = Slip10.derivePath(Slip10Curve.Secp256k1, walletSeed, path);
// console.log(slip);
const signingKp = await Secp256k1.makeKeypair(slip.privkey);
// console.log(signingKp);


// const data = {
//     "publicKey": "BJ0IWB4PZ5qWuEBPLEW8zWjjrz7L0po1iTu0WHQ_XbQednERMqSTzxZKkuH2s_3z9M204Ve0pV9UvQPLU8v9rT4",
//     "currency": "cosmos",
//     "amount": "1",
//     "nonce": 2,
//     "signature": "JkjX2agtthEv1CuZSdOGRHsamermuk89L87DTpJss7I3hows-TDaVCbqdN8m4CYOFYPEmSrtHk8Qna61Pj8Q3Q",
//     "sigType": 5
// }


const p = base64url.toBuffer(sampleData.publicKey)
console.log("Sample PubKey ", Uint8Array.from(p));
const signature = base64url.toBuffer(sampleData.signature)

const deephash = await deepHash([stringToBuffer(sampleData.currency), stringToBuffer(sampleData.amount.toString()), stringToBuffer(sampleData.nonce.toString())]);


const sampleSig = await Secp256k1.createSignature(sha256(deephash), signingKp.privkey);
console.log("Create Sig from privKey", sampleSig.toFixedLength());

const testSig = secp256k1.ecdsaSign(
    sha256(Buffer.from(deephash)),
    Buffer.from(slip.privkey),
  ).signature;

console.log("T: ", testSig);
const verified = secp256k1.ecdsaVerify(
        signature,
        sha256(Buffer.from(deephash)),
        p,
);

console.log("Verify ", verified);
console.log(await Secp256k1.verifySignature(Secp256k1Signature.fromFixedLength(sig.toFixedLength().slice(0,-1)),  sha256(Buffer.from(message)), p));
console.log(await Secp256k1.verifySignature(Secp256k1Signature.fromFixedLength(testSig),  sha256(Buffer.from(message)), p));
}

main();