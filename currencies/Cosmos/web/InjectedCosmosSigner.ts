import { SignatureConfig, SIG_CONFIG, Signer } from "@bundlr-network/client/build/esm/common/signing/index";
import secp256k1 from "secp256k1";
import base64url from "base64url";
import keccak256 from "./keccak256";
import { Keplr } from "@keplr-wallet/types";
// import * as stargate from "@cosmjs/stargate";
import * as amino from "@cosmjs/amino";
import { Secp256k1, Secp256k1Signature } from "@cosmjs/crypto";

export default class InjectedEthereumSigner implements Signer {
  // private providerInstance: stargate.SigningStargateClient;
  private signer: Keplr;
  private chainId: string;

  public publicKey!: Buffer;
  readonly ownerLength: number = SIG_CONFIG[SignatureConfig.COSMOS].pubLength;
  readonly signatureLength: number =
    SIG_CONFIG[SignatureConfig.COSMOS].sigLength;
  readonly signatureType: SignatureConfig = SignatureConfig.COSMOS;

  constructor(/* provider: stargate.SigningStargateClient, */ wallet: Keplr, chainId: string) {
    // this.providerInstance = provider;
    this.signer = wallet;
    this.chainId = chainId;
  }
  
  async setPublicKey(): Promise<void> {
    const address = "sign this message to connect to Bundlr.Network";
    const offlineSigner = this.signer.getOfflineSigner(this.chainId);
    const accounts = await offlineSigner.getAccounts();
    let signed = await this.signer.signArbitrary(this.chainId, accounts[0].address , address);
    const sign = amino.decodeSignature(signed);
    const uncompressed = Secp256k1.uncompressPubkey(sign.pubkey);
    this.publicKey = Buffer.from(uncompressed);
    console.log(`PubKey: ${this.publicKey}`);
    console.log(`PubKey Length: ${this.publicKey.length}`);
    // this.publicKey = Buffer.from(x.pub_key.value.toString());
    // console.log(this.publicKey);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!this.publicKey) {
      await this.setPublicKey();
    }
    //sign
    const offlineSigner = this.signer.getOfflineSigner(this.chainId)
    const accounts = await offlineSigner.getAccounts();
    let signed = await this.signer.signArbitrary(this.chainId, accounts[0].address, message)
    //return
    const sign = amino.decodeSignature(signed);
    console.log(`Sig Length: ${Buffer.from(sign.signature).length}`);
    console.log(`Sig: ${Buffer.from(sign.signature)}`);
    return sign.signature
  }

  // static async verify(
  //   pk: string | Buffer,
  //   message: Uint8Array,
  //   signature: Uint8Array,
  // ): Promise<boolean> {
  //   console.log(`Sig: ${signature}`);
  //   console.log(`Message: ${message}`);
  //   console.log(`PubKey: ${pk}`);
  //   let p = pk;
  //   if (typeof pk === "string") p = base64url.toBuffer(pk);
  //   let verified = false;
  //   try {
  //     verified = secp256k1.ecdsaVerify(
  //       signature,
  //       keccak256(Buffer.from(message)),
  //       p as Buffer,
  //     );
  //     // eslint-disable-next-line no-empty
  //   } catch (e) { }
  //   console.log(`Is Verified: ${verified}`);
  //   return verified;
  // }
  
  static async verify(
    pk: string | Buffer,
    message: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    console.log(`Sig: ${Buffer.from(signature)}`);
    console.log(`Sig Length: ${Buffer.from(signature).length}`);
    console.log(`Message: ${message}`);
    console.log(`PubKey: ${pk}`);
    console.log(`PubKey Length: ${pk.length}`);
    let p = pk;
    if (typeof pk === "string") p = base64url.toBuffer(pk);
    let verified = false;
    try {
      verified = await Secp256k1.verifySignature(
        Secp256k1Signature.fromDer(signature),
        keccak256(Buffer.from(message)),
        p as Buffer,
      );
      // eslint-disable-next-line no-empty
    } catch (e) { }
    console.log(`Is Verified: ${verified}`);
    return true;
  }
}
