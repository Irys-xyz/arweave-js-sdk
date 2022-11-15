import { Signer } from "./Signer";
export interface JWKInterface extends JWKPublicInterface {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
}


export interface JWKPublicInterface {
    kty: string;
    e: string;
    n: string;
}

// export interface IndexToPackage {
//     [key: number]: string
// }

export interface IndexToType {
    [key: number]: {
        new(...args: any[]): Signer;
        readonly signatureLength: number;
        readonly ownerLength: number;
        verify(
            pk: string | Uint8Array,
            message: Uint8Array,
            signature: Uint8Array,
        ): Promise<boolean>;
    };
}

export interface DataItemCreateOptions {
    /**
     * @deprecated
     */
    data?: never;
    target?: string;
    anchor?: string;
    tags?: {
        name: string;
        value: string;
    }[];
}

export interface SignatureMeta {
    sigLength: number;
    pubLength: number;
    sigName: string;
}


export type staticSigner = {
    new(...args): Signer;
    readonly signatureLength: number;
    readonly ownerLength: number;
    verify(
        pk: string | Uint8Array,
        message: Uint8Array,
        signature: Uint8Array,
    ): Promise<boolean>;
};


type ResolvesTo<T> = T | Promise<T> | ((...args: any[]) => Promise<T>);

export abstract class BundleItem {
    readonly signatureType: ResolvesTo<number>;
    readonly rawSignature: ResolvesTo<Buffer>;
    readonly signature: ResolvesTo<string>;
    readonly signatureLength: ResolvesTo<number>;
    readonly rawOwner: ResolvesTo<Buffer>;
    readonly owner: ResolvesTo<string>;
    readonly ownerLength: ResolvesTo<number>;
    readonly rawTarget: ResolvesTo<Buffer>;
    readonly target: ResolvesTo<string>;
    readonly rawAnchor: ResolvesTo<Buffer>;
    readonly anchor: ResolvesTo<string>;
    readonly rawTags: ResolvesTo<Buffer>;
    readonly tags: ResolvesTo<{ name: string; value: string; }[]>;
    readonly rawData: ResolvesTo<Buffer>;
    readonly data: ResolvesTo<string>;
    abstract sign(signer: Signer): Promise<Buffer>;
    abstract isValid(): Promise<boolean>;
    static async verify(..._: any[]): Promise<boolean> {
        throw new Error("You must implement `verify`");
    }
}
