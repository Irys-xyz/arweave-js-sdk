import keccak256 from "arbundles/src/signing/keccak256";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { InjectedEthereumSigner, Signer } from "arbundles/src/signing";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseWebCurrency from "../currency";

const ethBigNumber = ethers.BigNumber; // required for hexString conversions (w/ 0x padding)
const ethereumSigner = InjectedEthereumSigner;

export default class EthereumConfig extends BaseWebCurrency {
    protected signer: InjectedEthereumSigner;
    protected wallet: ethers.providers.Web3Provider;
    protected w3signer: ethers.providers.JsonRpcSigner;
    protected providerInstance?: ethers.providers.JsonRpcProvider;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["wei", 1e18];
    }


    async getTx(txId: string): Promise<Tx> {
        const provider = this.providerInstance;
        const response = await provider.getTransaction(txId);

        if (!response) throw new Error("Tx doesn't exist");

        return {
            from: response.from,
            to: response.to,
            blockHeight: response.blockNumber ? new BigNumber(response.blockNumber) : null,
            amount: new BigNumber(response.value.toHexString(), 16),
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= this.minConfirm,
        };
    }

    ownerToAddress(owner: any): string {
        return "0x" + keccak256(Buffer.from(owner.slice(1))).slice(-20).toString("hex");
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = await this.getSigner();
        return signer.sign(data);
    }

    getSigner(): Signer {
        if (!this.signer) {
            this.signer = new InjectedEthereumSigner(this.wallet);
        }
        return this.signer;
    }


    async verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return ethereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const provider = this.providerInstance;
        const response = await provider.send("eth_blockNumber", []);

        return new BigNumber(response, 16);
    }

    async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
        const provider = this.providerInstance;

        const tx = {
            to,
            from: this.address,
            value: "0x" + (new BigNumber(amount)).toString(16),
        };

        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        return new BigNumber(estimatedGas.mul(gasPrice).toString());
    }

    async sendTx(data: ethers.providers.TransactionRequest): Promise<string | undefined> {
        const signer = this.w3signer;
        const receipt = await signer.sendTransaction(data);// .catch((e) => { console.error(`Sending tx: ${e}`) })
        return receipt ? receipt.hash : undefined;
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const amountc = ethBigNumber.from((new BigNumber(amount)).toFixed());
        const signer = this.w3signer;
        const estimatedGas = await signer.estimateGas({ to, from: this.address, value: amountc.toHexString() });
        let gasPrice = await signer.getGasPrice();
        if (this.name === "matic") {
            gasPrice = ethers.BigNumber.from(new BigNumber(gasPrice.toString()).multipliedBy(10).decimalPlaces(0).toString());
        }
        const txr = await signer.populateTransaction({ to, from: this.address, value: amountc.toHexString(), gasPrice, gasLimit: estimatedGas });
        return { txId: undefined, tx: txr };
    }

    public async getPublicKey(): Promise<string | Buffer> {
        const signer = await this.getSigner() as InjectedEthereumSigner;
        await signer.setPublicKey();
        return signer.publicKey;
    }

    pruneBalanceTransactions(_txIds: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async ready(): Promise<void> {
        this.w3signer = await this.wallet.getSigner();
        this._address = this.ownerToAddress(await this.getPublicKey());
        this.providerInstance = new ethers.providers.JsonRpcProvider(this.providerUrl);
        await this.providerInstance?._ready();
    }


}
