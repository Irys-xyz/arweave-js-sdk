import { Signer } from "arbundles/src/signing";
import "@polkadot/api-augment/substrate";
import PolkadotSigner from "arbundles/src/signing/chains/PolkadotSigner"
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as PolkaApi from "@polkadot/api";


import { encodeAddress } from "@polkadot/util-crypto"
import { AnyJson } from "@polkadot/types-codec/types";
import { construct, getRegistry, methods } from "@substrate/txwrapper-polkadot";
// import { createSigningPayload } from "@substrate/txwrapper-core/lib/core/construct";
import { getRegistryPolkadot } from "@substrate/txwrapper-core";
export default class PolkadotConfig extends BaseNodeCurrency {
    protected providerInstance?: PolkaApi.ApiPromise
    protected providerWss: PolkaApi.WsProvider;
    protected signerInstance: PolkadotSigner

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["planck", 1e10];
        this._address = "You need to .ready() this currency!"
    }

    protected async getProvider(): Promise<PolkaApi.ApiPromise> {
        if (!this.providerInstance) {
            this.providerInstance = await PolkaApi.ApiPromise.create({ provider: await this.getWebsocket() });
            await this.providerInstance.isReady;
        }
        return this.providerInstance;
    }

    protected async getWebsocket(): Promise<PolkaApi.WsProvider> {
        if (!this.providerWss) {
            this.providerWss = new PolkaApi.WsProvider(this.providerUrl);
        }
        return this.providerWss;
    }

    async getSystemEvents(hash: string): Promise<AnyJson> {
        const provider = await this.getProvider();
        const allRecords = await provider.query.system.events.at(hash);
        return allRecords.toHuman();
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider();
        const [blkHash, txHash] = txId.split(":");
        const signedBlock = await provider.rpc.chain.getBlock(blkHash);

        const events = await this.getSystemEvents(blkHash);

        const tx = signedBlock.block.extrinsics.find(el => el.hash.toString() === txHash);

        let txStatus = false;
        signedBlock.block.extrinsics.forEach((el, index) => {
            if (el.hash.toString() === txHash) {
                const x = Object.entries(events);
                if (!x) throw new Error("Tx not yet successful");
                txStatus = x.some((ve) => {
                    return (ve[1].phase.ApplyExtrinsic === index.toString() && ve[1].event.method === "ExtrinsicSuccess")
                });
               
            }
        });

        const currentBlock = await provider.rpc.chain.getBlock();

        console.log(txStatus);
        const confirms = currentBlock.block.header.number.toNumber() - signedBlock.block.header.number.toNumber()
        console.log(confirms);
        
        if (tx.length < 1) {
            throw new Error("Transaction Not Found");
        } else {
            const sender = tx.signer.value.toString();
            const receiver = tx.method.args[0].toString()
            const amount = new BigNumber(tx.method.args[1].toString());
            console.log(`Sender: ${sender}, Receiver: ${receiver}, Amount: ${amount}`);
            return {
                from: sender,
                to: receiver,
                amount,
                pending: false,
                confirmed: confirms >= this.minConfirm
            }
        }
    }

    ownerToAddress(owner: any): string {
        return encodeAddress(owner, 0);
    }

    async sign(_data: any): Promise<any> {
        return this.signerInstance.sign(_data);
    }

    getSigner(): Signer {
        return this.signerInstance
    }

    async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return PolkadotSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = await this.getProvider();
        const lastHeader = await provider.rpc.chain.getHeader();
        return new BigNumber(lastHeader.number.toString())
    }

    async getFee(amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        /* 
            Requires that you fake-sign a tx and send and read fee from res
        */
        const provider = await this.getProvider();
        const sender = this.ownerToAddress(this.getPublicKey());
        const info = await provider.tx.balances
            .transfer(sender, amount.toString())
            .paymentInfo(sender);
        return new BigNumber(info.partialFee.toString());
    }

    async sendTx(_data: any): Promise<any> {
        const provider = await this.getProvider();
        const signature = await this.sign(_data.tx.extrinsicPayload);
        const metadataRpc = (await provider.rpc.state.getMetadata()).toHex();
        const registry = getRegistryPolkadot(29, metadataRpc);
        const signedTx = construct.signedTx(_data.tx.unsignedTx, signature, { metadataRpc, registry });

        return provider.rpc.author.submitExtrinsic(signedTx);
    }

    async generateTxPayload(value: string, to: string): Promise<any>{
        const provider = await this.getProvider();
        const { block } = await provider.rpc.chain.getBlock();
        const blockHash = (await provider.rpc.chain.getBlockHash()).toString();
        const genesisHash = (await provider.rpc.chain.getBlockHash(0)).toString();
        const metadataRpc = (await provider.rpc.state.getMetadata()).toHex();
        const versions = await provider.rpc.state.getRuntimeVersion();
        const specVersion = versions.specVersion.toNumber();
        const transactionVersion = versions.transactionVersion.toNumber();
        // Create Polkadot's type registry.
        const registry = getRegistryPolkadot(29, metadataRpc);
    
        // Now we can create our `balances.transferKeepAlive` unsigned tx. The following
        // function takes the above data as arguments, so can be performed offline
        // if desired.
        const unsigned = methods.balances.transferKeepAlive(
            {
                value: value,
                dest: to, // Bob
            },
            {
                address: this.ownerToAddress(this.getPublicKey()),
                blockHash,
                blockNumber: registry
                    .createType("BlockNumber", block.header.number)
                    .toNumber(),
                eraPeriod: 64,
                genesisHash,
                metadataRpc,
                nonce: 0, // Assuming this is Alice's first tx on the chain
                specVersion,
                tip: 0,
                transactionVersion,
            },
            {
                metadataRpc,
                registry,
            }
        );
        return unsigned;
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        console.log(amount);
        // const unsignedTx = provider.tx.balances.transfer(to, new BigNumber(amount).toNumber());
        const unsignedTx = await this.generateTxPayload(amount.toString(), to);
        const metadataRpc = (await provider.rpc.state.getMetadata()).toHex();
        const registry = getRegistryPolkadot(29, metadataRpc);
        const extrinsicPayload = construct.signingPayload(unsignedTx, { registry })

        return {
            txId: unsignedTx.hash.toString(),
            tx: {
                unsignedTx,
                extrinsicPayload
            }
        }
    }

    getPublicKey(): Buffer {
        return this.signerInstance.publicKey;
    }

    public async ready(): Promise<boolean> {
        this.signerInstance = new PolkadotSigner(this.wallet);
        await this.signerInstance.ready()
        await this.assignAddress()
        return true;
    }

}