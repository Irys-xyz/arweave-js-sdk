import { SignatureConfig, SIG_CONFIG, Signer } from "@bundlr-network/client/build/esm/common/signing/index";
import secp256k1 from "secp256k1";
import base64url from "base64url";
import keccak256 from "./keccak256";
import { Keplr } from "@keplr-wallet/types";
import * as stargate from "@cosmjs/stargate";

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
    let x = await this.signer.signArbitrary(this.chainId, accounts[0].address , address)
    this.publicKey = Buffer.from(x.pub_key.value);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!this.publicKey) {
      await this.setPublicKey();
    }
    //sign
    const offlineSigner = this.signer.getOfflineSigner(this.chainId)
    const accounts = await offlineSigner.getAccounts();
    let x = await this.signer.signArbitrary(this.chainId, accounts[0].address, message)
    //return
    return Buffer.from(x.signature);
  }

  static async verify(
    pk: string | Buffer,
    message: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    let p = pk;
    if (typeof pk === "string") p = base64url.toBuffer(pk);
    let verified = false;
    try {
      verified = secp256k1.ecdsaVerify(
        signature,
        keccak256(Buffer.from(message)),
        p as Buffer,
      );
      // eslint-disable-next-line no-empty
    } catch (e) { }
    return verified;
  }
}
