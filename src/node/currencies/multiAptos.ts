// import { TransactionBuilderMultiEd25519, TxnBuilderTypes } from "aptos";
// import BigNumber from "bignumber.js";
// import { BCS } from "aptos"
import { CurrencyConfig } from "../../common/types";
import Aptos from "./aptos";

export type AptosMultiSigTx = {
    publicKey: string,
    participants: string[]
    threshold: number,
    authKey: string,
    address: string
}

export default class MultiSignatureAptos extends Aptos {
    constructor(config: CurrencyConfig) {
        super(config);
    }



    // override async createMultiSigTx(amount: BigNumber.Value, to: string, opts: { participants: any[], threshold: number; }, fee?: string): Promise<any> {
    //     // const signatureInfo = // 
    //     const client = await this.getProvider()
    //     const multiSigPublicKey = new TxnBuilderTypes.MultiEd25519PublicKey(
    //         opts.participants,
    //         /*  [
    //              new TxnBuilderTypes.Ed25519PublicKey(account1.signingKey.publicKey),
    //              new TxnBuilderTypes.Ed25519PublicKey(account2.signingKey.publicKey),
    //              new TxnBuilderTypes.Ed25519PublicKey(account3.signingKey.publicKey),
    //          ], */
    //         // Threshold
    //         opts.threshold
    //     );

    //     const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);
    //     const mutisigAccountAddress = authKey.derivedAddress();

    //     const token = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));

    //     const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    //         TxnBuilderTypes.EntryFunction.natural(
    //             // Fully qualified module name, `AccountAddress::ModuleName`
    //             "0x1::coin",
    //             // Module function
    //             "transfer",
    //             // The coin type to transfer
    //             [token],
    //             // Arguments for function `transfer`: receiver account address and amount to transfer
    //             [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(to)), BCS.bcsSerializeUint64(123)],
    //         ),
    //     );

    //     const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
    //         client.getAccount(mutisigAccountAddress),
    //         client.getChainId(),
    //     ]);

    //     const rawTxn = new TxnBuilderTypes.RawTransaction(
    //         // Transaction sender account address
    //         TxnBuilderTypes.AccountAddress.fromHex(mutisigAccountAddress),
    //         BigInt(sequenceNumber),
    //         entryFunctionPayload,
    //         // Max gas unit to spend
    //         BigInt(2000),
    //         // Gas price per unit
    //         BigInt(1),
    //         // Expiration timestamp. Transaction is discarded if it is not executed within 10 seconds from now.
    //         BigInt(Math.floor(Date.now() / 1000) + 10),
    //         new TxnBuilderTypes.ChainId(chainId),
    //     );

    //     return rawTxn

    // }
    // override async addSignature(multiTx: any, opts: any): Promise<any> {
    //     const pubKeyPos = opts.keyNum
    //     const txnBuilder = new TransactionBuilderMultiEd25519((signingMessage: TxnBuilderTypes.SigningMessage) => {
    //         const sigHexStr = this.accountInstance.signBuffer(signingMessage);

    //         // Bitmap masks which public key has signed transaction.
    //         // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#createBitmap
    //         const bitmap = TxnBuilderTypes.MultiEd25519Signature.createBitmap([0, 2]);

    //         // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
    //         const muliEd25519Sig = new TxnBuilderTypes.MultiEd25519Signature(
    //             [
    //                 new TxnBuilderTypes.Ed25519Signature(sigHexStr1.toUint8Array()),
    //                 new TxnBuilderTypes.Ed25519Signature(sigHexStr3.toUint8Array()),
    //             ],
    //             bitmap,
    //         );

    //         return muliEd25519Sig;
    //     }, multiSigPublicKey);

    //     const bcsTxn = txnBuilder.sign(rawTxn);
    // }
}