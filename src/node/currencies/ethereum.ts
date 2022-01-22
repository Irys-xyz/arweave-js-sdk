import keccak256 from "keccak256";
import { publicKeyCreate } from "secp256k1";
import { ethers, Wallet } from "ethers";
import BigNumber from "bignumber.js";
import { signers } from "arbundles";
import { Signer } from "arbundles/src/signing";
import { JsonRpcProvider } from "@ethersproject/providers";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";


const ethereumSigner = signers.EthereumSigner;

// export interface EthCurrencyConfig extends CurrencyConfig {
//     // eslint-disable-next-line @typescript-eslint/naming-convention
//     isEIP1559?: boolean
// }
export default class EthereumConfig extends BaseNodeCurrency {
    protected providerInstance: JsonRpcProvider;

    constructor(config: CurrencyConfig) {
        super(config);
        this.base = ["wei", 1e18];

    }

    protected async getProvider(): Promise<JsonRpcProvider> {
        if (!this.providerInstance) {
            this.providerInstance = new ethers.providers.JsonRpcProvider(this.providerUrl);
            await this.providerInstance.ready
        }
        return this.providerInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const provider = await this.getProvider()

        const response = await provider.getTransaction(txId);
        // const r2 = await provider.getTransactionReceipt(txId);
        // console.log(r2);
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
        return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        const signer = new ethereumSigner(this.wallet);
        return signer.sign(data);
    }

    getSigner(): Signer {
        return new ethereumSigner(this.wallet);
    }

    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
        return ethereumSigner.verify(pub, data, signature);
    }

    async getCurrentHeight(): Promise<BigNumber> {
        const response = await (await this.getProvider()).send("eth_blockNumber", []);
        return new BigNumber(response, 16);
    }

    async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
        const provider = await this.getProvider()
        const _amount = new BigNumber(amount)
        const tx = {
            to,
            value: "0x" + _amount.toString(16),
        };

        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();

        // const b = await provider.send("eth_maxPriorityFeePerGas", [])
        // console.log(b)
        return new BigNumber(estimatedGas.mul(gasPrice).toString());
    }


    async sendTx(data: any): Promise<any> {
        return (await (await this.getProvider()).sendTransaction(data).catch(e => { console.error(`Error occurred while sending a tx - ${e}`); throw e }));
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        const provider = await this.getProvider()
        const wallet = new Wallet(this.wallet, provider);

        const _amount = "0x" + new BigNumber(amount).toString(16);

        // const gasPrice = await provider.getGasPrice();
        // const estimatedGas = await provider.estimateGas({ to, value: _amount });

        // console.log({ gasPrice, estimatedGas })

        const tx = await wallet.populateTransaction({
            to,
            value: _amount,
            // gasPrice,
            // gasLimit: estimatedGas,
            // nonce: await provider.getTransactionCount(this.address),
            // chainId: await (await provider.getNetwork()).chainId
        });

        const signedTx = await wallet.signTransaction(tx);
        const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
        return { txId, tx: signedTx };
    }

    getPublicKey(): string | Buffer {
        return Buffer.from(publicKeyCreate(Buffer.from(this.wallet, "hex"), false));
    }

}