import { TransactionBuilder, TransactionBuilderMultiEd25519, TxnBuilderTypes, BCS, AptosAccount } from "aptos";
import { RawTransaction } from "aptos/src/aptos_types/transaction"
import BigNumber from "bignumber.js";
import { CurrencyConfig } from "../../common/types";
import Aptos from "./aptos";
import { Signer, MultiSignatureAptosSigner } from "arbundles/src/signing";
// import Utils from "../../common/utils";

export type AptosMultiSigTx = {
    publicKey: string,
    participants: HexString[]
    // threshold: number,
    // authKey: AuthenticationKey,
    // address: string,
    rawTx: RawTransaction,
    signatures: HexString[],
    participantSignatureMap: number[]

}
export type HexString = string;
export default class MultiSignatureAptos extends Aptos {

    declare wallet: { participants: Buffer[], threshold: number }
    //@ts-ignore
    declare protected signerInstance: MultiSignatureAptosSigner;
    protected collectSignatures: (message: Uint8Array) => Promise<{ signatures: Buffer[], bitmap: number[] }>


    constructor(config: CurrencyConfig & { opts: { collectSignatures } }) {
        super(config);
        this.collectSignatures = this?.opts?.collectSignatures
        this.needsFee = false;
    }

    /**
     * 
     * @param owner compound MultiEd25519PublicKey .toBytes()
     */


    ownerToAddress(pubKey: Buffer): string {
        // deserialise key
        const multiSigPublicKey = this.deserialisePubKey(pubKey)

        // derive address
        const authKey2 = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);
        return authKey2.derivedAddress().toString()
    }


    protected deserialisePubKey(pubKey: Buffer): TxnBuilderTypes.MultiEd25519PublicKey {
        const threshold = +pubKey.slice(32 * 32).toString()
        const keys = []
        const nullBuf = Buffer.alloc(32, 0)
        for (let i = 0; i < 32; i++) {
            let key = pubKey.subarray(i * 32, (i + 1) * 32)
            if (!key.equals(nullBuf)) keys.push(new TxnBuilderTypes.Ed25519PublicKey(key))
        }
        // reconstruct key
        return new TxnBuilderTypes.MultiEd25519PublicKey(
            keys,
            threshold
        )
    }

    getPublicKey(): string | Buffer {
        const { participants, threshold } = this.wallet

        const pkey = Buffer.alloc(32 * 32 + 1)
        participants.forEach((k, i) => {
            pkey.set(k, i * 32);
        })

        pkey.set(Buffer.from(threshold.toString()), 1024)
        return pkey
    }

    async createTx(amount: BigNumber.Value, to: string, fee?: string): Promise<{ txId: string; tx: any; }> {
        const client = await this.getProvider()
        const { participants, threshold } = this.wallet

        const multiSigPublicKey = new TxnBuilderTypes.MultiEd25519PublicKey(
            participants.map(v => new TxnBuilderTypes.Ed25519PublicKey(v)),
            threshold
        )

        const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey)
        const mutisigAccountAddress = authKey.derivedAddress();

        const token = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));

        const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
            TxnBuilderTypes.EntryFunction.natural(
                // Fully qualified module name, `AccountAddress::ModuleName`
                "0x1::coin",
                // Module function
                "transfer",
                // The coin type to transfer
                [token],
                // Arguments for function `transfer`: receiver account address and amount to transfer
                [
                    BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(to)),
                    BCS.bcsSerializeUint64(new BigNumber(amount).toNumber())
                ],
            ),
        );

        const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
            client.getAccount(mutisigAccountAddress),
            client.getChainId(),
        ]);

        const rawTx = new TxnBuilderTypes.RawTransaction(
            // Transaction sender account address
            TxnBuilderTypes.AccountAddress.fromHex(mutisigAccountAddress),
            BigInt(sequenceNumber),
            entryFunctionPayload,
            // Max gas unit to spend
            BigInt(fee ?? 2000),
            // Gas price per unit
            BigInt(/* (opts?.perGas ?? */ 1),
            // Expiration timestamp. Transaction is discarded if it is not executed within 1000 seconds (16.6 minutes) from now.
            BigInt(Math.floor(Date.now() / 1000) + 1000),
            new TxnBuilderTypes.ChainId(chainId),
        );

        return { tx: rawTx, txId: undefined }

    }

    async sendTx(data: any): Promise<string> {
        const client = await this.getProvider()
        const signingMessage = TransactionBuilder.getSigningMessage(data)
        const { signatures, bitmap } = await this.collectSignatures(signingMessage)
        const txnBuilder = new TransactionBuilderMultiEd25519((_: TxnBuilderTypes.SigningMessage) => {
            // Bitmap masks which public key has signed transaction.
            // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#createBitmap
            const encodedBitmap = TxnBuilderTypes.MultiEd25519Signature.createBitmap(bitmap);

            // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
            const muliEd25519Sig = new TxnBuilderTypes.MultiEd25519Signature(
                signatures.map((s) => new TxnBuilderTypes.Ed25519Signature(s)),
                encodedBitmap
            );

            return muliEd25519Sig;
            //@ts-ignore
        }, this.deserialisePubKey(this.getPublicKey()));


        //@ts-ignore
        const bcsTxn = txnBuilder.sign(data);
        const txRes = await client.submitSignedBCSTransaction(bcsTxn);
        return txRes.hash
    }

    getSigner(): Signer {
        if (this.signerInstance) return this.signerInstance
        const pkey = Buffer.alloc(1025)
        const deserKey = this.deserialisePubKey(this.getPublicKey() as Buffer)
        deserKey.public_keys.forEach((k, i) => {
            pkey.set(k.value, i * 32);
        })
        pkey.set(Buffer.from(deserKey.threshold.toString()), 1024)

        return this.signerInstance ??= new MultiSignatureAptosSigner(pkey, this.collectSignatures)
    }

    async ready(): Promise<void> {
        await super.ready()
        this.accountInstance = new AptosAccount(undefined, this.address)
    }

    // async createMultiSigTx(amount: BigNumber.Value, to: string, opts: { participants: Uint8Array[], threshold: number, gasLimit?: number, perGas?: number }): Promise<AptosMultiSigTx> {

    //     const client = await this.getProvider()
    //     const { participants, threshold } = opts

    //     const multiSigPublicKey = new TxnBuilderTypes.MultiEd25519PublicKey(
    //         participants.map(v => new TxnBuilderTypes.Ed25519PublicKey(v)),
    //         threshold
    //     )

    //     const bytes = multiSigPublicKey.toBytes()
    //     console.log(bytes)


    //     const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey)
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
    //             [
    //                 BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(to)),
    //                 BCS.bcsSerializeUint64(new BigNumber(amount).toNumber())
    //             ],
    //         ),
    //     );

    //     const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
    //         client.getAccount(mutisigAccountAddress),
    //         client.getChainId(),
    //     ]);

    //     const rawTx = new TxnBuilderTypes.RawTransaction(
    //         // Transaction sender account address
    //         TxnBuilderTypes.AccountAddress.fromHex(mutisigAccountAddress),
    //         BigInt(sequenceNumber),
    //         entryFunctionPayload,
    //         // Max gas unit to spend
    //         BigInt(opts?.gasLimit ?? 2000),
    //         // Gas price per unit
    //         BigInt(opts?.perGas ?? 1),
    //         // Expiration timestamp. Transaction is discarded if it is not executed within 1000 seconds (16.6 minutes) from now.
    //         BigInt(Math.floor(Date.now() / 1000) + 1000),
    //         new TxnBuilderTypes.ChainId(chainId),
    //     );

    //     return {
    //         // @ts-ignore silly type private field issue
    //         publicKey: multiSigPublicKey.toBytes(),
    //         participants: opts.participants.map(v => Buffer.from(v).toString("hex") as HexString),
    //         threshold: opts.threshold,
    //         // @ts-ignore
    //         // authKey,
    //         //@ts-ignore
    //         rawTx,
    //         signatures: new Array(participants.length).fill(undefined),
    //         participantSignatureMap: []
    //     }

    // }


    // async addSignature(multiTx: AptosMultiSigTx, opts?: any): Promise<any> {
    //     // const pubKeyPos = opts.keyNum
    //     const participants = multiTx.participants.map(k => new TxnBuilderTypes.Ed25519PublicKey(Buffer.from(k, "hex")))
    //     const pubKey = new TxnBuilderTypes.Ed25519PublicKey(this.accountInstance.signingKey.publicKey)
    //     const participantPos = participants.findIndex(key => key.value === pubKey.value)

    //     if (participantPos === -1) throw new Error(`Invalid participant position (participant may be missing)`)
    //     if (multiTx.participantSignatureMap.includes(participantPos)) throw new Error(`Account already participates`)
    //     //@ts-ignore
    //     const signingMessage = TransactionBuilder.getSigningMessage(multiTx.rawTx)
    //     const signature = this.accountInstance.signBuffer(signingMessage)
    //     multiTx.participantSignatureMap.push(participantPos)
    //     multiTx.signatures[participantPos] = (signature as unknown as HexString)

    //     return multiTx

    // }


    // async submitMultiSigTx(multiTx: AptosMultiSigTx, opts?: any) {

    //     const client = await this.getProvider()

    //     const txnBuilder = new TransactionBuilderMultiEd25519((signingMessage: TxnBuilderTypes.SigningMessage) => {
    //         // @ts-ignore
    //         if (signingMessage != TransactionBuilder.getSigningMessage(multiTx.rawTx)) {
    //             throw new Error("SigningMessage mismatch! please create a github issue")
    //         }

    //         // Bitmap masks which public key has signed transaction.
    //         // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#createBitmap
    //         const bitmap = TxnBuilderTypes.MultiEd25519Signature.createBitmap(multiTx.participantSignatureMap);

    //         // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
    //         const muliEd25519Sig = new TxnBuilderTypes.MultiEd25519Signature(
    //             /* [
    //                 new TxnBuilderTypes.Ed25519Signature(sigHexStr1.toUint8Array()),
    //                 new TxnBuilderTypes.Ed25519Signature(sigHexStr3.toUint8Array()),
    //             ] */
    //             multiTx.signatures.filter((v) => !!v).map((s) => new TxnBuilderTypes.Ed25519PublicKey(Buffer.from(s, "hex"))),
    //             bitmap
    //         );

    //         return muliEd25519Sig;
    //         //@ts-ignore
    //     }, multiTx.publicKey);


    //     //@ts-ignore
    //     const bcsTxn = txnBuilder.sign(multiTx.rawTx);
    //     const txRes = await client.submitSignedBCSTransaction(bcsTxn);
    //     // use regular transfer logic here.
    //     await client.waitForTransactionWithResult(txRes.hash, { checkSuccess: true })
    //     // submit to bundler node

    // }

}