import { Signer } from "arbundles/src/signing";
// import { signers } from "arbundles";
import PolkadotSigner from "arbundles/src/signing/chains/PolkadotSigner"
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as api from "@polkadot/api";
// import SignerResult from "@polkadot/api/types";
import { encodeAddress } from "@polkadot/util-crypto"

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


    /**
     * txId = blockHash + : + txHash
     * get signedBlock
     * filter block for txID
     */
    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider();
        const [blkHash, txHash] = txId.split(":");
        const signedBlock = await provider.rpc.chain.getBlock(blkHash)
        const allRecords = await provider.query.system.events.at(signedBlock.block.header.hash);
        // signedBlock.block.extrinsics.forEach(({ method: { method, section } }, index) => {
        //     allRecords
        //     // filter the specific events based on the phase and then the
        //     // index of our extrinsic in the block
        //     .filter(({ phase }) =>
        //         phase.isApplyExtrinsic &&
        //         phase.asApplyExtrinsic.eq(index)
        //     )
        //     // test the events against the specific types we are looking for
        //     .forEach(({ event }) => {
        //         if (provider.events.system.ExtrinsicSuccess.is(event)) {
        //             // extract the data for this event
        //             // (In TS, because of the guard above, these will be typed)
        //             const [dispatchInfo] = event.data;

        //             console.log(`${section}.${method}:: ExtrinsicSuccess:: ${JSON.stringify(dispatchInfo.toHuman())}`);
        //         }
        //     });
        // })
        const tx = signedBlock.block.extrinsics.find(el => el.hash.toString() === txHash);
        if (tx.length < 1) {
            throw new Error("Transaction Not Found");
        } else {
            const sender = tx.signer.value.toString(); // sender
            const receiver = tx.method.args[0].toString() // to
            const amount = new BigNumber(tx.method.args[1].toString()); // value
            console.log(`Sender: ${sender}, Receiver: ${receiver}, Amount: ${amount}`);
            return {
                from: sender,
                to: receiver,
                amount,
                pending: false, // tx scoped to block,
                confirmed: false
            }
        }
        throw new Error("Could not get TX.");
    }

    ownerToAddress(owner: any): string {
        return encodeAddress(Buffer.from(owner, "base64")) // optional format?
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
        .transfer(sender, 123)
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

    getPublicKey(): string {
        return this.signerInstance.publicKey.toString("base64")
    }

    public async ready(): Promise<boolean> {
        this.signerInstance = new PolkadotSigner(this.wallet);
        await this.signerInstance.ready()
        await this.assignAddress()
        return true;
    }

}