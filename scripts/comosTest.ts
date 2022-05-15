import secp256k1 from "secp256k1";
//@ts-ignore
import keccak256 from "./keccak256";
import { deepHash } from "arbundles";
import { stringToBuffer } from "arweave/node/lib/utils.js";
import base64url from "base64url";
import { EnglishMnemonic, Secp256k1, Secp256k1Signature, sha256, ExtendedSecp256k1Signature, Slip10RawIndex, HdPath, Slip10Curve, stringToPath, Bip39, Slip10, } from "@cosmjs/crypto";
import {
  makeSignDoc,
  pubkeyToAddress,
  serializeSignDoc,
  StdSignDoc,
} from '@cosmjs/amino';
import { fromBase64, toAscii, toBase64 } from '@cosmjs/encoding';
import { getKeplrFromWindow } from "@keplr-wallet/stores";

const prefix = "cosmos";

const main = async () => {

// // const sampleSignerData = {
// //     "message": "",
// //     "publicKey":"BJ0IWB4PZ5qWuEBPLEW8zWjjrz7L0po1iTu0WHQ_XbQednERMqSTzxZKkuH2s_3z9M204Ve0pV9UvQPLU8v9rT4",
// //     "currency":"cosmos",
// //     "amount":"1",
// //     "nonce":2,
// //     "signature":"JkjX2agtthEv1CuZSdOGRHsamermuk89L87DTpJss7I3hows-TDaVCbqdN8m4CYOFYPEmSrtHk8Qna61Pj8Q3Q",
// //     "sigType":5
// // }

const PubKey = Uint8Array.from([4, 157, 8, 88, 30, 15, 103, 154, 150, 184, 64, 79, 44, 69, 188, 205, 104, 227, 175, 62, 203, 210, 154, 53, 137, 59, 180, 88, 116, 63, 93, 180, 30, 118, 113, 17, 50, 164, 147, 207, 22, 74, 146, 225, 246, 179, 253, 243, 244, 205, 180, 225, 87, 180, 165, 95, 84, 189, 3, 203, 83, 203, 253, 173, 62]);
const Signature = Uint8Array.from([38, 72, 215, 217, 168, 45, 182, 17, 47, 212, 43, 153, 73, 211, 134, 68, 123, 26, 153, 234, 230, 186, 79, 61, 47, 206, 195, 78, 146, 108, 179, 178, 55, 134, 140, 44, 249, 48, 218, 84, 38, 234, 116, 223, 38, 224, 38, 14, 21, 131, 196, 153, 42, 237, 30, 79, 16, 157, 174, 181, 62, 63, 16, 221]);
const Message = Uint8Array.from([136, 161, 71, 110, 90, 98, 2, 254, 110, 72, 144, 181, 49, 53, 187, 118, 5, 137, 183, 102, 183, 46, 38, 219, 68, 143, 22, 193, 77, 165, 65, 6, 214, 4, 192, 7, 23, 25, 63, 219, 211, 69, 181, 223, 118, 94, 86, 228]);
    
    // const message = await deepHash([stringToBuffer("cosmos"), stringToBuffer("1"), stringToBuffer("2")])

    // const chainId = "cosmoshub-4";
    // const wallet = await getKeplrFromWindow();
    //       if(wallet !== undefined){
    //         await wallet.enable(chainId);        

    //         const offlineSigner = wallet.getOfflineSigner(chainId)
    //         const accounts = await offlineSigner.getAccounts();
    //         let signed = await wallet.signArbitrary(chainId, accounts[0].address, deepHash.toString());
    //         console.log("PubKey: ", accounts[0].pubkey);
    //         console.log("Signature: ", signed.signature);

            // const PubKey = accounts[0].pubkey
            // const Signature = Buffer.from(signed.signature);
            // const Message = message;

            const compressedPubKey = Secp256k1.compressPubkey(PubKey);

            console.log(await verifyADR036Signature(toBase64(Message), toBase64(compressedPubKey), toBase64(Signature)));

            // const mnemonic = new EnglishMnemonic("moon spirit genius shrimp first language bird marble practice vocal maple radar");
            // const walletSeed = await Bip39.mnemonicToSeed(mnemonic);
            // // console.log(walletSeed);
            // const path = stringToPath("m/44'/118'/0'/0/0");
            // const slip = Slip10.derivePath(Slip10Curve.Secp256k1, walletSeed, path);
            // // console.log(slip);
            // const signingKp = await Secp256k1.makeKeypair(slip.privkey);
            // console.log(signingKp.pubkey);
          }
}



function makeADR036AminoSignDoc(message: string, pubKey: string): StdSignDoc {
  const signer = pubkeyToAddress(
    {
      type: 'tendermint/PubKeySecp256k1',
      value: pubKey,
    },
    prefix,
  );

  return makeSignDoc(
    [
      {
        type: 'sign/MsgSignData',
        value: {
          signer,
          data: toBase64(toAscii(message)),
        },
      },
    ],
    {
      gas: '0',
      amount: [],
    },
    '',
    '',
    0,
    0,
  );
}

export async function verifyADR036Signature(
  message: string,
  pubKey: string,
  signature: string,
): Promise<boolean> {
  const signBytes = serializeSignDoc(makeADR036AminoSignDoc(message, pubKey));
  const messageHash = sha256(signBytes);

  const parsedSignature = Secp256k1Signature.fromFixedLength(
    fromBase64(signature),
  );
  const parsedPubKey = fromBase64(pubKey);

  return await Secp256k1.verifySignature(
    parsedSignature,
    messageHash,
    parsedPubKey,
  );
}


main();