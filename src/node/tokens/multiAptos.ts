import BigNumber from "bignumber.js";
import type { TokenConfig } from "../../common/types";
import Aptos from "./aptos";
import type { Signer } from "arbundles";
import { MultiSignatureAptosSigner } from "arbundles";
import type { PendingTransactionResponse, UserTransactionResponse } from "@aptos-labs/ts-sdk";
import {
  AccountAddress,
  AuthenticationKey,
  ChainId,
  Ed25519PublicKey,
  MimeType,
  Ed25519Signature,
  EntryFunction,
  MultiEd25519PublicKey,
  MultiEd25519Signature,
  RawTransaction,
  SignedTransaction,
  SigningScheme,
  TransactionAuthenticatorMultiEd25519,
  TransactionPayloadEntryFunction,
  U64,
  parseTypeTag,
  postAptosFullNode,
  AccountAuthenticatorEd25519,
  TransactionAuthenticatorEd25519,
  generateSigningMessageForTransaction,
} from "@aptos-labs/ts-sdk";
// import Utils from "../../common/utils";

export type HexString = string;
export default class MultiSignatureAptos extends Aptos {
  declare wallet: { participants: Buffer[]; threshold: number };
  // @ts-expect-error signer inheretance contract violation
  protected declare signerInstance: MultiSignatureAptosSigner;
  protected collectSignatures: (message: Uint8Array) => Promise<{ signatures: Buffer[]; bitmap: number[] }>;

  constructor(config: TokenConfig & { opts: { collectSignatures } }) {
    super(config);
    this.collectSignatures = this?.opts?.collectSignatures;
    this.needsFee = true;
  }

  /**
   * @param owner compound MultiEd25519PublicKey .toBytes()
   */
  ownerToAddress(pubKey: Buffer): string {
    // deserialise key
    const multiSigPublicKey = this.deserialisePubKey(pubKey);

    // derive address
    const authKey2 = AuthenticationKey.fromPublicKeyAndScheme({ publicKey: multiSigPublicKey, scheme: SigningScheme.MultiEd25519 });
    return authKey2.derivedAddress().toString();
  }

  protected deserialisePubKey(pubKey: Buffer): MultiEd25519PublicKey {
    const threshold = +pubKey.slice(32 * 32).toString();
    const keys = [] as /* Ed25519PublicKey */ any[];
    const nullBuf = Buffer.alloc(32, 0);
    for (let i = 0; i < 32; i++) {
      const key = pubKey.subarray(i * 32, (i + 1) * 32);
      if (!key.equals(nullBuf)) keys.push(new Ed25519PublicKey(key));
    }
    // reconstruct key
    return new MultiEd25519PublicKey({ publicKeys: keys, threshold });
  }

  getPublicKey(): string | Buffer {
    const { participants, threshold } = this.wallet;

    const pkey = Buffer.alloc(32 * 32 + 1);
    participants.forEach((k, i) => {
      pkey.set(k, i * 32);
    });

    pkey.set(Buffer.from(threshold.toString()), 1024);
    return pkey;
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<{ gasUnitPrice: number; maxGasAmount: number }> {
    const client = await this.getProvider();

    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run Irys.ready()");

    const transaction = await client.transaction.build.simple({
      sender: this.address,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [to ?? "0x149f7dc9c8e43c14ab46d3a6b62cfe84d67668f764277411f98732bf6718acf9", new BigNumber(amount).toNumber()],
      },
    });

    const accountAuthenticator = new AccountAuthenticatorEd25519(new Ed25519PublicKey(this.getPublicKey()), new Ed25519Signature(new Uint8Array(64)));

    const transactionAuthenticator = new TransactionAuthenticatorEd25519(accountAuthenticator.public_key, accountAuthenticator.signature);

    const signedSimulation = new SignedTransaction(transaction.rawTransaction, transactionAuthenticator).bcsToBytes();

    const queryParams = {
      estimate_gas_unit_price: true,
      estimate_max_gas_amount: true,
    };

    const { data } = await postAptosFullNode<Uint8Array, UserTransactionResponse[]>({
      aptosConfig: this.aptosConfig,
      body: signedSimulation,
      path: "transactions/simulate",
      params: queryParams,
      originMethod: "simulateTransaction",
      contentType: MimeType.BCS_SIGNED_TRANSACTION,
    });

    return { gasUnitPrice: +data[0].gas_unit_price, maxGasAmount: +data[0].max_gas_amount };
  }

  async createTx(
    amount: BigNumber.Value,
    to: string,
    fee?: { gasUnitPrice: number; maxGasAmount: number },
  ): Promise<{ txId: string | undefined; tx: any }> {
    const client = await this.getProvider();
    const { participants, threshold } = this.wallet;

    const multiSigPublicKey = new MultiEd25519PublicKey({ publicKeys: participants.map((v) => new Ed25519PublicKey(v)), threshold });

    const authKey = AuthenticationKey.fromPublicKeyAndScheme({ publicKey: multiSigPublicKey, scheme: SigningScheme.MultiEd25519 });
    const mutisigAccountAddress = authKey.derivedAddress();

    const token = parseTypeTag("0x1::aptos_coin::AptosCoin");

    const entryFunctionPayload = EntryFunction.build(
      `0x1::coin`,
      `transfer`,
      [token],
      [AccountAddress.from(to), new U64(new BigNumber(amount).toNumber())],
    );

    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
      client.getAccountInfo({ accountAddress: mutisigAccountAddress }),
      client.getChainId(),
    ]);

    const rawTx = new RawTransaction(
      // Transaction sender account address
      AccountAddress.from(mutisigAccountAddress),
      BigInt(sequenceNumber),
      new TransactionPayloadEntryFunction(entryFunctionPayload),
      // Max gas unit to spend
      BigInt(fee?.maxGasAmount ?? 100_00),
      // Gas price per unit
      BigInt(fee?.gasUnitPrice ?? 100),
      // Expiration timestamp. Transaction is discarded if it is not executed within 1000 seconds (16.6 minutes) from now.
      BigInt(Math.floor(Date.now() / 1000) + 1000),
      new ChainId(chainId),
    );

    return { tx: rawTx, txId: undefined };
  }

  async sendTx(data: any): Promise<string> {
    const client = await this.getProvider();
    const signingMessage = generateSigningMessageForTransaction(data);
    const { signatures, bitmap } = await this.collectSignatures(signingMessage);

    const encodedBitmap = MultiEd25519Signature.createBitmap({ bits: bitmap });

    const muliEd25519Sig = new MultiEd25519Signature({ signatures: signatures.map((s) => new Ed25519Signature(s)), bitmap: encodedBitmap });

    const authenticator = new TransactionAuthenticatorMultiEd25519(this.deserialisePubKey(this.getPublicKey() as Buffer), muliEd25519Sig);

    const bcsTxn = new SignedTransaction(data, authenticator);

    const { data: postData } = await postAptosFullNode<Uint8Array, PendingTransactionResponse>({
      aptosConfig: this.aptosConfig,
      body: bcsTxn,
      path: "transactions",
      originMethod: "submitTransaction",
      contentType: MimeType.BCS_SIGNED_TRANSACTION,
    });

    await client.waitForTransaction({ transactionHash: postData.hash });
    return postData.hash;
  }

  getSigner(): Signer {
    if (this.signerInstance) return this.signerInstance;
    const pkey = Buffer.alloc(1025);
    const deserKey = this.deserialisePubKey(this.getPublicKey() as Buffer);
    deserKey.publicKeys.forEach((k, i) => {
      pkey.set(k.toUint8Array(), i * 32);
    });
    pkey.set(Buffer.from(deserKey.threshold.toString()), 1024);

    return (this.signerInstance ??= new MultiSignatureAptosSigner(pkey, this.collectSignatures));
  }

  async ready(): Promise<void> {
    await super.ready();
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await MultiSignatureAptosSigner.verify(pub, data, signature);
  }
}
