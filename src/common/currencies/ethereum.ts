import { currencies, Currency, getRedstonePrice, Tx } from "./index";
import keccak256 from "keccak256";
import { publicKeyCreate } from "secp256k1";
import { ethers, Wallet } from "ethers";
import BigNumber from "bignumber.js";
import { signers } from "arbundles";
import base64url from "base64url";
import Arweave from "arweave";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { Signer } from "arbundles/src/signing";


const EthereumSigner = signers.EthereumSigner;

export function ethConfigFactory(config: { name: string, ticker: string, providerUrl?: string, minConfirm: number, account: Currency["account"] }): Currency {
    const { name, ticker, minConfirm, account } = config;
    const providerUrl = config.providerUrl;


    async function ethSign(message: Uint8Array): Promise<Uint8Array> {
        const signer = new EthereumSigner(account.key);
        return signer.sign(message);
    }

    function ethGetSigner(): Signer {
        return new EthereumSigner(account.key);
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

    async function ethCreateTx(amount, to, _fee?): Promise<any> {
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);
        const key = account.key;
        await provider._ready();
        const wallet = new Wallet(key, provider);
        let bigNumberAmount: BigNumber;
        if (BigNumber.isBigNumber(amount)) {
            bigNumberAmount = amount;
        } else {
            bigNumberAmount = new BigNumber(amount);
        }
        const _amount = "0x" + bigNumberAmount.toString(16);

        const estimatedGas = await provider.estimateGas({ to, value: _amount });
        const gasPrice = await provider.getGasPrice();

        const tx = await wallet.populateTransaction({
            to,
            value: _amount,
            gasPrice,
            gasLimit: estimatedGas,
        });

        const signedTx = await wallet.signTransaction(tx);
        const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
        return { txId, tx: signedTx };

    }

    async function ethSendTx(tx: string): Promise<void> {
        try {
            const provider = new ethers.providers.JsonRpcProvider(providerUrl);
            await provider._ready();

            await provider.sendTransaction(tx);
        } catch (e) {
            console.error(`Error occurred while sending a MATIC tx - ${e}`);
            throw e;
        }
    }

    function ethGetPublicKey(): Buffer {
        return Buffer.from(publicKeyCreate(Buffer.from(currencies[name].account.key, "hex"), false));
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
