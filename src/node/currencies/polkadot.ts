import { Signer } from "arbundles/src/signing";
// import { signers } from "arbundles";
import PolkadotSigner from "arbundles/src/signing/chains/PolkadotSigner"
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as api from "@polkadot/api";
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
        const tx = signedBlock.block.extrinsics.find(el => el.hash.toString() === txHash);
        if (tx.length < 1) {
            throw new Error("Transaction Not Found");
        } else {

            // return {
            //     from: tx.,
            //     to: tx.to,
            //     amount: new BigNumber(tx.value.toHexString(), 16),
            //     pending: tx.blockNumber ? false : true,
            //     confirmed: tx.confirmations >= this.minConfirm,
            // };
        }
        return {
            from: "a",
            to: "a",
            amount: new BigNumber(1),
            pending: false,
            confirmed: false
        }
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
        throw new Error("Method not implemented.");
    }
    async sendTx(_data: any): Promise<any> {
        // const provider = await this.getProvider();
        // api.ApiPromise.
        // return (await (await this.getProvider())). .catch(e => { console.error(`Error occurred while sending a tx - ${e}`); throw e }));
        throw new Error("Method not implemented.");
    }
    async createTx(_amount: BigNumber.Value, _to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        // const API = await api.ApiPromise.create();
        // const transfer = API.tx.balances.transfer(BOB, _amount);


        throw new Error("Method not implemented.");
    }

    getPublicKey(): string {
        // const pair = keyring.createFromUri(_owner);
        // return Buffer.from(pair.publicKey);
        return this.signerInstance.publicKey.toString("base64")
    }

    public async ready(): Promise<boolean> {
        this.signerInstance = new PolkadotSigner(this.wallet);
        await this.signerInstance.ready()
        await this.assignAddress()
        return true;
    }

}