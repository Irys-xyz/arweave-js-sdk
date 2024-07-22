import type { Signer } from "arbundles";
import { AptosSigner } from "arbundles";
import BigNumber from "bignumber.js";
import type { TokenConfig, Tx } from "../../common/types";
import { BaseNodeToken } from "./base";
import sha3 from "js-sha3";
import {
  Aptos,
  AptosConfig as AptosSDKConfig,
  Account,
  MimeType,
  postAptosFullNode,
  generateSignedTransaction,
  Ed25519PublicKey,
  Ed25519PrivateKey,
  TransactionAuthenticatorEd25519,
  AccountAuthenticatorEd25519,
  Ed25519Signature,
  SignedTransaction,
  generateSigningMessageForTransaction,
} from "@aptos-labs/ts-sdk";
import type { UserTransactionResponse, PendingTransactionResponse } from "@aptos-labs/ts-sdk";
import AsyncRetry from "async-retry";

export default class AptosConfig extends BaseNodeToken {
  protected declare providerInstance?: Aptos;
  protected accountInstance: Account | undefined;
  protected signerInstance: AptosSigner | undefined;
  protected aptosConfig: AptosSDKConfig;
  protected declare signingFn: (msg: Uint8Array) => Promise<Uint8Array>;
  declare opts: any;
  protected txLock: Promise<unknown> = Promise.resolve();
  protected locked = false;

  constructor(config: TokenConfig) {
    if (typeof config.wallet === "string" && config.wallet.length === 66) {
      // If signingFunction is provided, the given `wallet` is a public key
      if (config?.opts?.signingFunction) {
        config.wallet = Buffer.from(config.wallet.slice(2), "hex");
      } else {
        config.wallet = new Ed25519PrivateKey(config.wallet);
        // @ts-expect-error custom prop
        config.accountInstance = Account.fromPrivateKey({ privateKey: config?.wallet });
      }
    }
    super(config);
    // @ts-expect-error assignment doesn't carry through for some reason
    this.accountInstance = config.accountInstance;
    this.signingFn = config?.opts?.signingFunction;
    this.needsFee = true;
    this.base = ["octa", 1e8];

    // In the Aptos context, this.providerUrl is the Aptos Network enum type we want
    // to work with. read more https://github.com/aptos-labs/aptos-ts-sdk/blob/main/src/api/aptosConfig.ts#L14
    // this.providerUrl is a Network enum type represents the current configured network
    this.aptosConfig = new AptosSDKConfig({ network: this.providerUrl, ...config?.opts?.aptosSdkConfig });
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
      const signer = new AptosSigner("", "0x" + this.getPublicKey().toString("hex"));
      signer.sign = this.signingFn; // override signer fn
      return (this.signerInstance = signer);
    } else {
      // @ts-expect-error private field use
      return (this.signerInstance = new AptosSigner(this.accountInstance!.privateKey.toString(), this.accountInstance!.publicKey.toString()));
    }
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await AptosSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber(((await (await this.getProvider()).getLedgerInfo()) as { block_height: string }).block_height);
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<{ gasUnitPrice: number; maxGasAmount: number }> {
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run Irys.ready()");
    const client = await this.getProvider();

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
    const [simulationResult] = await AsyncRetry(
      async (_) => {
        const { data } = await postAptosFullNode<Uint8Array, UserTransactionResponse[]>({
          aptosConfig: this.aptosConfig,
          body: signedSimulation,
          path: "transactions/simulate",
          params: queryParams,
          originMethod: "simulateTransaction",
          contentType: MimeType.BCS_SIGNED_TRANSACTION,
        });
        if (!data[0].success || data[0].gas_used === "0") throw new Error(`${data[0]?.vm_status} - ${JSON.stringify(data[0])}`);
        return data;
      },
      { retries: 3, maxTimeout: 1_000, minTimeout: 200 },
    ).catch((e) => {
      if (this.irys.debug) console.warn(`Tx simulation failed (3 attempts): ${e?.message ?? e}`);
      return [{ gas_unit_price: "100", gas_used: "10" }];
    });

    return { gasUnitPrice: +simulationResult.gas_unit_price, maxGasAmount: Math.ceil(+simulationResult.gas_used * 2) };

    // const simulationResult = await client.simulateTransaction(this.accountInstance, rawTransaction, { estimateGasUnitPrice: true, estimateMaxGasAmount: true });
    // return new BigNumber(simulationResult?.[0].gas_unit_price).multipliedBy(simulationResult?.[0].gas_used);
    // const est = await provider.client.transactions.estimateGasPrice();
    // return new BigNumber(est.gas_estimate/* (await (await this.getProvider()).client.transactions.estimateGasPrice()).gas_estimate */); // * by gas limit (for upper limit)
  }

  async sendTx(data: { tx: Uint8Array; unlock?: () => void }): Promise<string | undefined> {
    const provider = await this.getProvider();

    const { data: postData } = await postAptosFullNode<Uint8Array, PendingTransactionResponse>({
      aptosConfig: this.aptosConfig,
      body: data.tx,
      path: "transactions",
      originMethod: "submitTransaction",
      contentType: MimeType.BCS_SIGNED_TRANSACTION,
    });

    await provider.waitForTransaction({ transactionHash: postData.hash });
    data.unlock?.();
    return postData.hash;
  }

  async createTx(
    amount: BigNumber.Value,
    to: string,
    fee?: { gasUnitPrice: number; maxGasAmount: number },
  ): Promise<{ txId: string | undefined; tx: any }> {
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run irys.ready()");
    // mutex so multiple aptos txs aren't in flight with the same sequence number
    const unlock = await this.lock();

    const client = await this.getProvider();

    const transaction = await client.transaction.build.simple({
      sender: this.address,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [to, new BigNumber(amount).toNumber()],
      },
      options: {
        gasUnitPrice: fee?.gasUnitPrice ?? 100,
        maxGasAmount: fee?.maxGasAmount ?? 10,
      },
    });

    const message = generateSigningMessageForTransaction(transaction);

    const signerSignature = await this.sign(message);

    const senderAuthenticator = new AccountAuthenticatorEd25519(new Ed25519PublicKey(this.getPublicKey()), new Ed25519Signature(signerSignature));

    const signedTransaction = generateSignedTransaction({ transaction, senderAuthenticator });

    return { txId: undefined, tx: { tx: signedTransaction, unlock } };
  }

  getPublicKey(): string | Buffer {
    if (this.opts?.signingFunction) return this.wallet;
    return Buffer.from(this.accountInstance!.publicKey.toUint8Array());
  }

  async ready(): Promise<void> {
    const client = await this.getProvider();
    this._address = await client
      .lookupOriginalAccountAddress({ authenticationKey: this.address ?? "" })
      .then((hs) => hs.toString())
      .catch((_) => this._address); // fallback to original

    if (this._address?.length == 66 && this._address.charAt(2) === "0") {
      this._address = this._address.slice(0, 2) + this._address.slice(3);
    }
  }
  // basic async mutex for transaction creation - done so sequenceNumbers don't overlap
  protected async lock(): Promise<any> {
    this.locked = true;
    let unlockNext;
    const willLock = new Promise((r) => (unlockNext = r));
    willLock.then(() => (this.locked = false));
    const willUnlock = this.txLock.then(() => unlockNext);
    this.txLock = this.txLock.then(() => willLock);
    return willUnlock;
  }
}
