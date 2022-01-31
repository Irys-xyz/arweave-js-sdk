import { Signer } from "arbundles/src/signing";
import "@polkadot/api-augment/substrate";
import PolkadotSigner from "arbundles/src/signing/chains/PolkadotSigner"
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as PolkaApi from "@polkadot/api";

import { encodeAddress } from "@polkadot/util-crypto"
import { AnyJson } from "@polkadot/types-codec/types";

// import bs58 from "bs58";

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
            let sender = tx.signer.value.toString();
            if(sender[0] === "5"){
                sender = encodeAddress(sender, 0);
            }
            let receiver = tx.method.args[0].toString()
            if(receiver[0] === "5"){
                receiver = encodeAddress(receiver, 0);
            }
            
            const amount = new BigNumber(tx.method.args[1].toString());
            const blockheight = new BigNumber(signedBlock.block.header.number.toNumber());

            console.log(`Sender: ${sender}, Receiver: ${receiver}, Amount: ${amount}`);
            return {
                from: sender,
                to: receiver,
                amount,
                blockHeight: blockheight,
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
        const sender = this.signerInstance.polkaPair.address;
        const info = await provider.tx.balances
            .transfer(sender, amount.toString())
            .paymentInfo(sender);
        return new BigNumber(info.partialFee.toString());
    }

    async sendTx(data: any): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return new Promise((res,_rej) => {
            data.unsignedTx.signAndSend(this.signerInstance.polkaPair, (data) => {
                if(data.status.isFinalized){
                    res(`${data.status.asFinalized.toString()}:${data.txHash.toString()}`);
                }
            });
        });
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider();
        const unsignedTx = await provider.tx.balances.transfer(to, new BigNumber(amount).toNumber());
        return {
            txId: unsignedTx.hash.toString(),
            tx: {
                unsignedTx
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