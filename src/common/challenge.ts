import base64url from "base64url";
import type Irys from "./irys";

export const stableStringify = (object): string =>
  JSON.stringify(object, (key, value) =>
    value instanceof Object && !(value instanceof Array)
      ? Object.keys(value)
          .sort()
          .reduce((sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          }, {})
      : value,
  );

export async function generateChallengeResponse({ challenge, irys }: { challenge: Challenge; irys: Irys }): Promise<ChallengeResponse> {
  const hash = await hashChallenge({ challenge, irys });

  const irysSigner = await irys.tokenConfig.getSigner();
  const responseSignature = Buffer.from(await irysSigner.sign(hash));
  const pubKey = await irysSigner.publicKey;

  const response: ChallengeResponse = {
    version: challenge.version,
    nonce: challenge.nonce,
    type: challenge.type,
    data: challenge.data,
    extra: challenge.extra,
    domain: challenge.domain,
    signature: {
      signature: base64url.encode(responseSignature),
      publicKey: base64url.encode(Buffer.isBuffer(pubKey) ? pubKey : Buffer.from(pubKey)),
      sigType: irysSigner.signatureType,
    },
  };

  return response;
}
export async function hashChallenge({ challenge, irys }: { challenge: Challenge; irys: Irys }): Promise<Uint8Array> {
  const hashComponents = [
    challenge.version.toString(),
    challenge.nonce,
    challenge.type,
    stableStringify(challenge.data),
    stableStringify(challenge.extra),
  ].map((d) => Buffer.from(d));

  if (challenge.extra) hashComponents.push(Buffer.from(stableStringify(challenge.extra)));

  const hash = await irys.arbundles.deepHash(hashComponents);
  return hash;
}

export async function verifyChallenge({ challenge, irys }: { challenge: Challenge; irys: Irys }): Promise<true> {
  // check if the challenge is valid
  const hash = await hashChallenge({ challenge, irys });
  if (challenge.signature.sigType !== 1) throw new Error("non-arweave challenge signers are not supported");
  const isValid = await irys.arbundles
    .getCryptoDriver()
    .verify(challenge.signature.publicKey, hash, base64url.toBuffer(challenge.signature.signature));
  if (!isValid) throw new Error("Invalid challenge signature");
  return isValid;
}

// basic
export const decodeChallenge = (challengeStr: string): Challenge => {
  const challengeJsonString = Buffer.from(challengeStr, "hex").toString();
  const challengeObj = JSON.parse(challengeJsonString) as Challenge;
  return challengeObj;
};

export const encodeChallengeResponse = (challenge: ChallengeResponse): string => {
  const challengeString = Buffer.from(JSON.stringify(challenge)).toString("hex");
  return challengeString;
};

// what we get from the node
export type Challenge = {
  version: number;
  nonce: string;
  type: string;
  data: Record<string, string>;
  extra?: Record<string, string>;
  domain: string;
  signature: {
    signature: string;
    sigType: number;
    publicKey: string; // TODO: should this be optional?
  };
};

// what we send back
export type ChallengeResponse = {
  version: number;
  nonce: string;
  type: string;
  data: Record<string, string>;
  extra?: Record<string, string>;
  domain: string;
  signature: {
    signature: string;
    sigType: number;
    publicKey: string;
  };
};
