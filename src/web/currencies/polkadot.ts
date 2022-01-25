import { Signer } from "arbundles/src/signing";
import PolkadotSigner from "arbundles/src/signing/chains/PolkadotSigner"
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as api from "@polkadot/api";

// import {
//     web3Accounts,
//     web3Enable,
//     web3FromAddress,
//     web3ListRpcProviders,
//     web3UseRpcProvider
//   } from "@polkadot/extension-dapp";


import { encodeAddress } from "@polkadot/util-crypto"
import { AnyJson } from "@polkadot/types-codec/types";
export default class PolkadotConfig extends BaseNodeCurrency {
    protected providerInstance?: api.ApiPromise
    protected providerWss: api.WsProvider;
    protected signerInstance: PolkadotSigner

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["planck", 1e10];
        this._address = "You need to .ready() this currency!"
    }

    protected async getProvider(): Promise<api.ApiPromise> {
        if (!this.providerInstance) {
            this.providerInstance = await api.ApiPromise.create({ provider: await this.getWebsocket() });
            await this.providerInstance.isReady;
        }
        return this.providerInstance;
    }

    protected async getWebsocket(): Promise<api.WsProvider> {
        if (!this.providerWss) {
            this.providerWss = new api.WsProvider(this.providerUrl);
        }
        return this.providerWss;
    }

    async getSystemEvents(hash: string): Promise<AnyJson>{
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

        const txStatus = signedBlock.block.extrinsics.forEach((el,index) => {
            if(el.hash.toString() === txHash ){
                const x = Object.entries(events);
                x.some((ve) => {
                    return (ve[1].phase.ApplyExtrinsic === index.toString() && ve[1].event.method === "ExtrinsicSuccess")

                });
                if(!x) throw new Error("Tx not yet successful");
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
        return encodeAddress(Buffer.from(owner, "base64"));
    }

    async sign(_data: Uint8Array): Promise<Uint8Array> {
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

    async getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber> {
        /* 
            Requires that you fake-sign a tx and send and read fee from res
        */
        const provider = await this.getProvider();
        const sender = this.ownerToAddress(this.getPublicKey());
        const info = await provider.tx.balances
        .transfer(sender, _amount)
        .paymentInfo(sender);
        return new BigNumber(info.partialFee.toString());
    }

    async sendTx(_data: any): Promise<any> {
        const provider = await this.getProvider();
        return provider.rpc.author.submitExtrinsic(provider.createType("Extrinsic",_data));
    }

    async createTx(_amount: BigNumber.Value, _to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        const transfer = provider.tx.balances.transfer(_to, _amount);
        const signedTx = await this.sign(transfer.toU8a());
        return {
            txId: transfer.hash.toString(),
            tx: signedTx
        }
    }

    async getPublicKey(): Promise<string> {
        return this.signerInstance.publicKey.toString("base64");
    }

    public async ready(): Promise<void> {
        this.signerInstance = new PolkadotSigner(this.wallet);
        await this.signerInstance.ready()
        // await this.assignAddress()
        // await web3Enable('my cool dapp');
        return;
    }

}