import { PolygonSigner } from "arbundles/src/signing";
import { currencies, Tx } from "./index";
import keccak256 from "keccak256";
import { publicKeyCreate } from "secp256k1";
import { ethers, Wallet } from "ethers";
import BigNumber from "bignumber.js";

export async function maticSign(message: Uint8Array): Promise<Uint8Array> {
    const signer = new PolygonSigner(currencies["matic"].account.key);
    return signer.sign(message);
}
export function maticGetSigner() {
    return new PolygonSigner(currencies["matic"].account.key);
}

export async function maticVerify(pub, data, sig): Promise<boolean> {
    return PolygonSigner.verify(pub, data, sig);
}

export function maticOwnerToAddress(owner: Uint8Array): string {
    return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
}

export async function maticGetTx(txId: string): Promise<Tx> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);

    const response = await provider.getTransaction(txId);

    if (!response) throw new Error("Tx doesn't exist");


    return {
        from: response.from,
        to: response.to,
        blockHeight: new BigNumber(response.blockNumber),
        amount: new BigNumber(response.value.toHexString(), 16),
        pending: !response.blockHash,
        confirmed: response.confirmations >= 10
    };
}

export async function maticGetHeight(): Promise<BigNumber> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);

    const response = await provider.send("eth_blockNumber", []);

    return new BigNumber(response, 16);
}

export async function maticGetFee(amount: BigNumber, to: string): Promise<BigNumber> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);

    await provider._ready();

    const tx = {
        to,
        value: "0x" + amount.toString(16)
    };

    const estimatedGas = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();

    return new BigNumber(estimatedGas.mul(gasPrice).toString());
}

export async function maticCreateTx(amount, to, _fee?): Promise<any> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);
    const key = currencies["matic"].account.key;
    await provider._ready();
    const wallet = new Wallet(key, provider);
    let bigNumberAmount: BigNumber;
    if (BigNumber.isBigNumber(amount)) {
        bigNumberAmount = amount
    } else {
        bigNumberAmount = new BigNumber(amount)
    }
    const _amount = "0x" + bigNumberAmount.toString(16);

    const estimatedGas = await provider.estimateGas({ to, value: _amount });
    const gasPrice = await provider.getGasPrice();

    const tx = await wallet.populateTransaction({
        to,
        value: _amount,
        gasPrice,
        gasLimit: estimatedGas
    });

    const signedTx = await wallet.signTransaction(tx);
    const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
    return { txId, tx: signedTx };

}

export async function maticSendTx(tx: string): Promise<void> {
    try {
        const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);
        await provider._ready();

        await provider.sendTransaction(tx);
    } catch (e) {
        console.error(`Error occurred while sending a MATIC tx - ${e}`);
        throw e;
    }
}

export function maticGetPublicKey(): Buffer {
    return Buffer.from(publicKeyCreate(Buffer.from(currencies["matic"].account.key, "hex"), false));
}
