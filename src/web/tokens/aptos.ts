import type { Network, PendingTransactionResponse, UserTransactionResponse } from "@aptos-labs/ts-sdk";
import {
  Aptos,
  AptosConfig as AptosSDKConfig,
  MimeType,
  postAptosFullNode,
  Ed25519PublicKey,
  TransactionAuthenticatorEd25519,
  AccountAuthenticatorEd25519,
  Ed25519Signature,
  SignedTransaction,
  generateSignedTransaction,
  generateSigningMessageForTransaction,
} from "@aptos-labs/ts-sdk";
import type { Signer } from "arbundles";
import { InjectedAptosSigner, AptosSigner } from "arbundles/web";
import BigNumber from "bignumber.js";
import type { TokenConfig, Tx } from "../../common/types";
import sha3 from "js-sha3";
import BaseWebToken from "./base";

export type SignMessagePayload = {
  address?: boolean; // Should we include the address of the account in the message
  application?: boolean; // Should we include the domain of the dapp
  chainId?: boolean; // Should we include the current chain id the wallet is connected to
  message: string; // The message to be signed and displayed to the user
  nonce: string; // A nonce the dapp should generate
};

export type SignMessageResponse = {
  address: string;
  application: string;
  chainId: number;
  fullMessage: string; // The message that was generated to sign
  message: string; // The message passed in by the user
  nonce: string;
  prefix: string; // Should always be APTOS
  signature: string; // The signed full message
};

type NetworkInfo = {
  name: Network;
  chainId?: string;
  url?: string;
};

export type AptosWallet = {
  account: { address: string; publicKey: string };
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
  network: NetworkInfo;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  signMessage: (payload: SignMessagePayload) => Promise<SignMessageResponse>;
  signTransaction: (transaction: any) => Promise<Uint8Array>;
};

export default class AptosConfig extends BaseWebToken {
  protected declare providerInstance?: Aptos;
  protected signerInstance!: InjectedAptosSigner | AptosSigner;
  protected declare wallet: AptosWallet;
  protected _publicKey!: Buffer;
  protected aptosConfig: AptosSDKConfig;
  protected signingFn?: (msg: Uint8Array) => Promise<Uint8Array>;

  constructor(config: TokenConfig) {
    super(config);
    this.signingFn = config?.opts?.signingFunction;

    this.base = ["octa", 1e8];
  }

  async getProvider(): Promise<Aptos> {
    return (this.providerInstance ??= new Aptos(this.aptosConfig));
  }

  async getTx(txId: string): Promise<Tx> {
    const client = await this.getProvider();
    const tx = (await client.waitForTransaction({ transactionHash: txId })) as any;
    const payload = tx?.payload as any;

    if (!tx.success) {
      throw new Error(tx?.vm_status ?? "Unknown Aptos error");
    }

    if (
      !(
        payload?.function === "0x1::coin::transfer" &&
        payload?.type_arguments[0] === "0x1::aptos_coin::AptosCoin" &&
        tx?.vm_status === "Executed successfully"
      )
    ) {
      throw new Error(`Aptos tx ${txId} failed validation`);
    }
    const isPending = tx.type === "pending_transaction";
    return {
      to: payload.arguments[0],
      from: tx.sender,
      amount: new BigNumber(payload.arguments[1]),
      pending: isPending,
      confirmed: !isPending,
    };
  }

  ownerToAddress(owner: any): string {
    const hash = sha3.sha3_256.create();
    hash.update(Buffer.from(owner));
    hash.update("\x00");
    return `0x${hash.hex()}`;
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return await this.getSigner().sign(data);
  }

  getSigner(): Signer {
    if (this.signerInstance) return this.signerInstance;
    if (this.signingFn) {
      const signer = new AptosSigner("", "0x" + this._publicKey.toString("hex"));
      signer.sign = this.signingFn; // override signer fn
      return (this.signerInstance = signer);
    }
    return (this.signerInstance = new InjectedAptosSigner(this.wallet, this._publicKey));
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await InjectedAptosSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber(((await (await this.getProvider()).getLedgerInfo()) as { block_height: string }).block_height);
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

    const accountAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(await this.getPublicKey()),
      new Ed25519Signature(new Uint8Array(64)),
    );

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

    // const simulationResult = await client.simulateTransaction(this.accountInstance, rawTransaction, { estimateGasUnitPrice: true, estimateMaxGasAmount: true });
    // return new BigNumber(simulationResult?.[0].gas_unit_price).multipliedBy(simulationResult?.[0].gas_used);
    // const est = await provider.client.transactions.estimateGasPrice();
    // return new BigNumber(est.gas_estimate/* (await (await this.getProvider()).client.transactions.estimateGasPrice()).gas_estimate */); // * by gas limit (for upper limit)
  }

  async sendTx(data: any): Promise<string | undefined> {
    if (!this.signingFn) return (await this.wallet.signAndSubmitTransaction(data)).hash;
    // return (await (await (this.getProvider())).submitSignedBCSTransaction(data)).hash;
    const provider = await this.getProvider();

    const { data: postData } = await postAptosFullNode<Uint8Array, PendingTransactionResponse>({
      aptosConfig: this.aptosConfig,
      body: data,
      path: "transactions",
      originMethod: "submitTransaction",
      contentType: MimeType.BCS_SIGNED_TRANSACTION,
    });

    await provider.waitForTransaction({ transactionHash: postData.hash });
    return postData.hash;
  }

  async createTx(
    amount: BigNumber.Value,
    to: string,
    fee?: { gasUnitPrice: number; maxGasAmount: number },
  ): Promise<{ txId: string | undefined; tx: any }> {
    const txData = {
      sender: this.address!,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [to, new BigNumber(amount).toNumber()],
      },
      options: {
        gasUnitPrice: fee?.gasUnitPrice ?? 100,
        maxGasAmount: fee?.maxGasAmount ?? 10,
      },
    };

    if (!this.signingFn) return { txId: undefined, tx: txData };

    const client = await this.getProvider();

    // @ts-expect-error type issue
    const transaction = await client.transaction.build.simple(txData);

    const message = generateSigningMessageForTransaction(transaction);

    const signerSignature = await this.sign(message);

    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(await this.getPublicKey()),
      new Ed25519Signature(signerSignature),
    );

    const signedTransaction = generateSignedTransaction({ transaction, senderAuthenticator });
    return { txId: undefined, tx: signedTransaction };
    // const rawTransaction = await client.generateRawTransaction(this.accountInstance.address(), payload);
    // const bcsTxn = AptosClient.generateBCSTransaction(this.accountInstance, rawTransaction);

    // const tx = await this.wallet.signTransaction(transaction);

    // return { txId: undefined, tx };
  }

  async getPublicKey(): Promise<string | Buffer> {
    return (this._publicKey ??= this.signingFn
      ? (Buffer.from((this.wallet as unknown as string).slice(2), "hex") as unknown as Buffer)
      : Buffer.from(this.wallet.account.publicKey.toString().slice(2), "hex"));
  }

  public async ready(): Promise<void> {
    // In the Aptos context, this.providerUrl is the Aptos Network enum type we want
    // to work with. read more https://github.com/aptos-labs/aptos-ts-sdk/blob/main/src/api/aptosConfig.ts#L14
    // this.providerUrl is a Network enum type represents the current configured network
    this.aptosConfig = new AptosSDKConfig({ network: this.providerUrl, ...this.config?.opts?.aptosSdkConfig });
    this._publicKey = (await this.getPublicKey()) as Buffer;
    this._address = this.ownerToAddress(this._publicKey);

    const client = await this.getProvider();

    this._address = await client
      .lookupOriginalAccountAddress({ authenticationKey: this.address ?? "" })
      .then((hs) => hs.toString())
      .catch((_) => this._address); // fallback to original

    if (this._address?.length == 66 && this._address.charAt(2) === "0") {
      this._address = this._address.slice(0, 2) + this._address.slice(3);
    }
  }
}
