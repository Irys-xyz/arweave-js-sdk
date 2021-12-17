import { Currency, getRedstonePrice, Tx } from "./index";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import base64url from "base64url";
import { InjectedEthereumSigner, Signer } from "arbundles/src/signing";
import Arweave from "arweave";
const ethBigNumber = ethers.BigNumber //required for hexString conversions (w/ 0x padding)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore


// export interface AsyncCurrency extends Currency {
//     getPublicKey(): Promise<Buffer | string>;
//     ownerToAddress(): Promise<string>;
// }

const EthereumSigner = InjectedEthereumSigner

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function ethConfigFactory(config: { name: string, ticker: string, providerUrl?: string, minConfirm: number, account: Currency["account"] }) {
    const { ticker, minConfirm, account, providerUrl } = config;
    const w3provider = account.key as ethers.providers.Web3Provider //TODO: OOP rewrite
    let signer;


    async function ethSign(message: Uint8Array): Promise<Uint8Array> {

        const signer = await ethGetSigner();
        return signer.sign(message);
    }

    function ethGetSigner(): Signer {
        if (!signer) {
            signer = new InjectedEthereumSigner(w3provider);
        }
        return signer
    }

    async function ethVerify(pub, data, sig): Promise<boolean> {
        return EthereumSigner.verify(pub, data, sig);
    }

    function ethOwnerToAddress(owner: Uint8Array): string {
        return "0x" + keccak256(Buffer.from(owner.slice(1))).slice(-20).toString("hex");
    }

    async function ethGetTx(txId: string): Promise<Tx> {
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);

        const response = await provider.getTransaction(txId);

        if (!response) throw new Error("Tx doesn't exist");

        return {
            from: response.from,
            to: response.to,
            blockHeight: response.blockNumber ? new BigNumber(response.blockNumber) : null,
            amount: new BigNumber(response.value.toHexString(), 16),
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= minConfirm,
        };
    }

    async function ethGetHeight(): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);

        const response = await provider.send("eth_blockNumber", []);

        return new BigNumber(response, 16);
    }

    async function ethGetFee(amount: BigNumber, to: string): Promise<BigNumber> {
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);

        await provider._ready();

        const tx = {
            to,
            value: "0x" + amount.toString(16),
        };

        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        return new BigNumber(estimatedGas.mul(gasPrice).toString());
    }

    async function ethCreateTx(amount: BigNumber, to: string, _fee?: BigNumber): Promise<any> {
        const amountc = ethBigNumber.from(amount.toString())
        const signer = await w3provider.getSigner();
        const estimatedGas = await signer.estimateGas({ to, value: amountc.toHexString() })
        const gasPrice = await signer.getGasPrice();
        const txr = await signer.populateTransaction({ to, value: amountc.toHexString(), gasPrice, gasLimit: estimatedGas })
        return { txId: "", tx: txr };
    }

    async function ethSendTx(tx: ethers.providers.TransactionRequest): Promise<any> {
        const signer = await w3provider.getSigner();
        const receipt = await signer.sendTransaction(tx).catch((e) => { console.error(`Sending tx: ${e}`) })
        return receipt ? receipt.hash : undefined
    }

    async function ethGetPublicKey(): Promise<Buffer> {
        const signer = await ethGetSigner() as InjectedEthereumSigner
        await signer.setPublicKey();
        return signer.publicKey;
    }


    return {
        base: ["wei", 1e18],
        account,
        provider: providerUrl,
        getTx: ethGetTx,
        getId: async (item): Promise<string> => {
            return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
        },
        ownerToAddress: ethOwnerToAddress,
        price: (): Promise<number> => getRedstonePrice(ticker),
        sign: ethSign,
        getSigner: ethGetSigner,
        verify: ethVerify,
        getCurrentHeight: ethGetHeight,
        getFee: ethGetFee,
        sendTx: ethSendTx,
        createTx: ethCreateTx,
        getPublicKey: ethGetPublicKey,

    }
}
