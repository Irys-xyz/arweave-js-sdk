import { AptosClient, CoinClient, HexString, TransactionBuilderEd25519, TxnBuilderTypes } from "aptos";
import type { Signer } from "arbundles";
import { InjectedAptosSigner } from "arbundles/web";
import BigNumber from "bignumber.js";
import type { CurrencyConfig, Tx } from "../../common/types";
import sha3 from "js-sha3";

// import { Ed25519PublicKey } from "aptos/src/aptos_types/ed25519";
// import { Transaction_UserTransaction, TransactionPayload_EntryFunctionPayload, TransactionPayload, PendingTransaction, UserTransaction } from "aptos/src/generated";
import BaseWebCurrency from "../currency";

export interface SignMessagePayload {
  address?: boolean; // Should we include the address of the account in the message
  application?: boolean; // Should we include the domain of the dapp
  chainId?: boolean; // Should we include the current chain id the wallet is connected to
  message: string; // The message to be signed and displayed to the user
  nonce: string; // A nonce the dapp should generate
}

export interface SignMessageResponse {
  address: string;
  application: string;
  chainId: number;
  fullMessage: string; // The message that was generated to sign
  message: string; // The message passed in by the user
  nonce: string;
  prefix: string; // Should always be APTOS
  signature: string; // The signed full message
}

export interface AptosWallet {
  account: () => Promise<{ address: string; publicKey: string }>;
  connect: () => Promise<{ address: string; publicKey: string }>;
  disconnect: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  network: () => Promise<"Testnet" | "Mainnet">;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  signMessage: (payload: SignMessagePayload) => Promise<SignMessageResponse>;
  signTransaction: (transaction: any) => Promise<Uint8Array>;
}

export default class AptosConfig extends BaseWebCurrency {
  protected declare providerInstance?: AptosClient;
  protected signerInstance!: InjectedAptosSigner;
  protected declare wallet: AptosWallet;
  protected _publicKey!: Buffer;

  constructor(config: CurrencyConfig) {
    // if (typeof config.wallet === "string" && config.wallet.length === 66) config.wallet = Buffer.from(config.wallet.slice(2), "hex");
    // // @ts-ignore
    // config.accountInstance = new AptosAccount(config.wallet);
    super(config);
    this.base = ["aptom", 1e8];
  }

  async getProvider(): Promise<AptosClient> {
    return (this.providerInstance ??= new AptosClient(this.providerUrl));
  }

  async getTx(txId: string): Promise<Tx> {
    const client = await this.getProvider();
    const tx = (await client.waitForTransactionWithResult(txId, /* { checkSuccess: true } */ { timeoutSecs: 1, checkSuccess: true })) as any;
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
    return (this.signerInstance ??= new InjectedAptosSigner(this.wallet, this._publicKey));
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await InjectedAptosSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber(
      ((await (await this.getProvider()).client.blocks.httpRequest.request({ method: "GET", url: "/" })) as { block_height: string }).block_height,
    );
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<{ gasUnitPrice: number; maxGasAmount: number }> {
    const client = await this.getProvider();
    const payload = new CoinClient(client).transactionBuilder.buildTransactionPayload(
      "0x1::coin::transfer",
      ["0x1::aptos_coin::AptosCoin"],
      [to ?? "0x149f7dc9c8e43c14ab46d3a6b62cfe84d67668f764277411f98732bf6718acf9", new BigNumber(amount).toNumber()],
    );
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
    const rawTransaction = await client.generateRawTransaction(new HexString(this.address), payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const txnBuilder = new TransactionBuilderEd25519((_signingMessage: TxnBuilderTypes.SigningMessage) => {
      const invalidSigBytes = new Uint8Array(64);
      return new TxnBuilderTypes.Ed25519Signature(invalidSigBytes);
    }, (await this.getPublicKey()) as Buffer);

    const signedSimulation = txnBuilder.sign(rawTransaction);

    const queryParams = {
      estimate_gas_unit_price: true,
      estimate_max_gas_amount: true,
    };

    const simulationResult = await client.client.request.request<any[]>({
      url: "/transactions/simulate",
      query: queryParams,
      method: "POST",
      body: signedSimulation,
      mediaType: "application/x.aptos.signed_transaction+bcs",
    });

    return { gasUnitPrice: +simulationResult[0].gas_unit_price, maxGasAmount: +simulationResult[0].max_gas_amount };

    // const simulationResult = await client.simulateTransaction(this.accountInstance, rawTransaction, { estimateGasUnitPrice: true, estimateMaxGasAmount: true });
    // return new BigNumber(simulationResult?.[0].gas_unit_price).multipliedBy(simulationResult?.[0].gas_used);
    // const est = await provider.client.transactions.estimateGasPrice();
    // return new BigNumber(est.gas_estimate/* (await (await this.getProvider()).client.transactions.estimateGasPrice()).gas_estimate */); // * by gas limit (for upper limit)
  }

  async sendTx(data: any): Promise<string | undefined> {
    return (await this.wallet.signAndSubmitTransaction(data)).hash;
    // return (await (await (this.getProvider())).submitSignedBCSTransaction(data)).hash;
  }

  async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string | undefined; tx: any }> {
    // const client = await this.getProvider();
    // const payload = new CoinClient(client).transactionBuilder.buildTransactionPayload(
    //     "0x1::coin::transfer",
    //     ["0x1::aptos_coin::AptosCoin"],
    //     [to, new BigNumber(amount).toNumber()],
    // );

    const tx = {
      arguments: [to, new BigNumber(amount).toNumber()],
      function: "0x1::coin::transfer",
      type: "entry_function_payload",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
    };

    // const rawTransaction = await client.generateRawTransaction(this.accountInstance.address(), payload);
    // const bcsTxn = AptosClient.generateBCSTransaction(this.accountInstance, rawTransaction);

    // const tx = await this.wallet.signTransaction(transaction);

    return { txId: undefined, tx };
  }

  async getPublicKey(): Promise<string | Buffer> {
    return (this._publicKey ??= Buffer.from((await this.wallet.account()).publicKey.toString().slice(2), "hex"));
  }

  public async ready(): Promise<void> {
    this._publicKey = (await this.getPublicKey()) as Buffer;
    this._address = this.ownerToAddress(this._publicKey);
    const client = await this.getProvider();

    this._address = await client
      .lookupOriginalAddress(this.address ?? "")
      .then((hs) => hs.toString())
      .catch((_) => this._address); // fallback to original

    if (this._address?.length == 66 && this._address.charAt(2) === "0") {
      this._address = this._address.slice(0, 2) + this._address.slice(3);
    }
  }
}
