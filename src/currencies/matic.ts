import PolygonSigner from "arbundles/build/signing/chains/PolygonSigner";
import { currencies, Tx } from "./index";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";

export async function polygonSign(message: Uint8Array): Promise<Uint8Array> {
    const signer = new PolygonSigner(currencies["matic"].account.key);
    return signer.sign(message);
}

export async function polygonVerify(pub, data, sig): Promise<boolean> {
    return PolygonSigner.verify(pub, data, sig);
}

export async function polygonOwnerToAddress(owner: Uint8Array): Promise<string> {
    return "0x" + keccak256(owner.slice(1)).slice(-20).toString("hex");
}

export async function getPolygonTx(txId: string): Promise<Tx> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);

    const response = await provider.send("eth_getTransactionByHash", [txId]);

    if (!response) throw new Error("Tx doesn't exist");

    return {
        from: response.from,
        blockHeight: response.blockNumber,
        amount: new BigNumber(response.value, 16),
        pending: !response.blockHash
    };
}

export async function polygonGetHeight(): Promise<BigNumber> {
    const provider = new ethers.providers.JsonRpcProvider(currencies["matic"].provider);

    const response = await provider.send("eth_blockNumber", []);

    return new BigNumber(response, 16);
}
