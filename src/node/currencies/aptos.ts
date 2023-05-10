import {
  AptosAccount,
  AptosClient,
  TransactionBuilder,
  TransactionBuilderEd25519,
  TransactionBuilderRemoteABI,
  TxnBuilderTypes /* BCS, TxnBuilderTypes */,
} from "aptos";
import type { Signer } from "arbundles";
import { AptosSigner } from "arbundles";
import BigNumber from "bignumber.js";
import type { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
import sha3 from "js-sha3";
// import { Transaction_UserTransaction, TransactionPayload_EntryFunctionPayload, UserTransaction, } from "aptos/src/generated";

export default class AptosConfig extends BaseNodeCurrency {
  protected declare providerInstance?: AptosClient;
  protected accountInstance: AptosAccount | undefined;
  protected signerInstance: AptosSigner | undefined;
  protected declare signingFn: (msg: Uint8Array) => Promise<Uint8Array>;
  declare opts: any;

  constructor(config: CurrencyConfig) {
    if (typeof config.wallet === "string" && config.wallet.length === 66) config.wallet = Buffer.from(config.wallet.slice(2), "hex");
    if (!config?.opts?.signingFunction && Buffer.isBuffer(config?.wallet)) {
      // @ts-expect-error custom prop
      config.accountInstance = new AptosAccount(config.wallet);
    }
    super(config);
    // @ts-expect-error assignment doesn't carry through for some reason
    this.accountInstance = config.accountInstance;
    this.signingFn = config?.opts?.signingFunction;
    this.needsFee = true;
    this.base = ["aptom", 1e8];
  }

  async getProvider(): Promise<AptosClient> {
    return (this.providerInstance ??= new AptosClient(this.providerUrl));
  }

  async getTx(txId: string): Promise<Tx> {
    const client = await this.getProvider();
    const tx = (await client.waitForTransactionWithResult(txId /* , { checkSuccess: true } */)) as any;
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
      return (this.signerInstance = new AptosSigner(
        this.accountInstance!.toPrivateKeyObject().privateKeyHex,
        this.accountInstance!.toPrivateKeyObject().publicKeyHex!,
      ));
    }
  }

  async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await AptosSigner.verify(pub, data, signature);
  }

  async getCurrentHeight(): Promise<BigNumber> {
    return new BigNumber(
      ((await (await this.getProvider()).client.blocks.httpRequest.request({ method: "GET", url: "/" })) as { block_height: string }).block_height,
    );
  }

  async getFee(amount: BigNumber.Value, to?: string): Promise<{ gasUnitPrice: number; maxGasAmount: number }> {
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
    const client = await this.getProvider();

    const builder = new TransactionBuilderRemoteABI(client, { sender: this.address });

    const rawTransaction = await builder.build(
      "0x1::coin::transfer",
      ["0x1::aptos_coin::AptosCoin"],
      [to ?? "0x149f7dc9c8e43c14ab46d3a6b62cfe84d67668f764277411f98732bf6718acf9", new BigNumber(amount).toNumber()],
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const txnBuilder = new TransactionBuilderEd25519((_signingMessage: TxnBuilderTypes.SigningMessage) => {
      const invalidSigBytes = new Uint8Array(64);
      return new TxnBuilderTypes.Ed25519Signature(invalidSigBytes);
    }, this.getPublicKey() as Buffer);

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
    return (await (await this.getProvider()).submitSignedBCSTransaction(data)).hash;
  }

  async createTx(
    amount: BigNumber.Value,
    to: string,
    fee?: { gasUnitPrice: number; maxGasAmount: number },
  ): Promise<{ txId: string | undefined; tx: any }> {
    if (!this.address) throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
    const client = await this.getProvider();
    // const payload = new CoinClient(client).transactionBuilder.buildTransactionPayload(
    //   "0x1::coin::transfer",
    //   ["0x1::aptos_coin::AptosCoin"],
    //   [to, new BigNumber(amount).toNumber()],
    // );

    // const rawTransaction = await client.generateRawTransaction(new HexString(this.address), payload, {
    //   gasUnitPrice: BigInt(fee?.gasUnitPrice ?? 100),
    //   maxGasAmount: BigInt(fee?.maxGasAmount ?? 100_000),
    // });
    const builder = new TransactionBuilderRemoteABI(client, {
      sender: this.address,
      gasUnitPrice: BigInt(fee?.gasUnitPrice ?? 100),
      maxGasAmount: BigInt(fee?.maxGasAmount ?? 100_000),
    });

    const rawTransaction = await builder.build("0x1::coin::transfer", ["0x1::aptos_coin::AptosCoin"], [to, new BigNumber(amount).toNumber()]);

    // const bcsTxn = AptosClient.generateBCSTransaction(this.accountInstance, rawTransaction);

    const signingMessage = TransactionBuilder.getSigningMessage(rawTransaction);
    const sig = await this.sign(signingMessage);

    const txnBuilder = new TransactionBuilderEd25519((_) => {
      return new TxnBuilderTypes.Ed25519Signature(sig);
    }, this.getPublicKey() as Buffer);

    const bcsTxn = txnBuilder.sign(rawTransaction);

    return { txId: undefined, tx: bcsTxn };
  }

  getPublicKey(): string | Buffer {
    if (this.opts?.signingFunction) return this.wallet;
    return Buffer.from(this.accountInstance!.pubKey().toString().slice(2), "hex");
  }

  async ready(): Promise<void> {
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
