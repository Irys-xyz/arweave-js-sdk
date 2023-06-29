import type { AxiosResponse } from "axios";
import type Irys from "./irys";
import type { TxGqlNode, TxGqlResponse, UploadReceipt } from "./types";
import type { Readable } from "stream";
import type { DataItemCreateOptions } from "arbundles";

export class Provenance {
  protected irys: Irys;

  constructor(irys: Irys) {
    this.irys = irys;
  }

  async upload(data: string | Buffer | Readable, opts?: DataItemCreateOptions): Promise<UploadReceipt> {
    return this.irys.uploadWithReceipt(data, opts);
  }

  public async uploadProof(proofFields: {
    dataProtocol?: string;
    hashingAlgo?: string;
    dataHash: string;
    uploadedFor?: string;
    prompt?: string;
    promptHash?: string;
    model?: string;
  }): Promise<UploadReceipt> {
    return await this.irys.uploadWithReceipt("", {
      tags: Object.entries({ dataProtocol: "Provenance-Confirmation", ...proofFields }).map(([k, v]) => ({ name: tagMap[k], value: v })),
    });
  }

  public async getAllProofs(
    searchBy: {
      dataProtocol?: string;
      hashingAlgo?: string;
      dataHash?: string;
      uploadedFor?: string;
      prompt?: string;
      promptHash?: string;
      model?: string;
    },
    opts?: { limit?: number },
  ): Promise<ProvenanceProofGQLNode[]> {
    const queryTags = Object.entries(searchBy).map(([k, v]) => ({ name: tagMap[k], values: [v] }));
    if (queryTags.length === 0) throw new Error(`Getting a provenance proof requires at least one query element`);
    const query = `
    query ($tags: [TagFilter!]) {
      transactions(tags: $tags) {
        edges {
          node {
            id
            receipt {
              deadlineHeight
              signature
              timestamp
              version
            }
            tags {
              name
              value
            }
          }
        }
      }
    }
    `;
    const txs: ProvenanceProofGQLNode[] = [];
    let endCursor: string | null = null;
    do {
      const gqlRes: AxiosResponse<TxGqlResponse> = await this.irys.api.post(
        "/graphql",
        {
          query,
          variables: { tags: queryTags, limit: opts?.limit ?? null, after: endCursor },
        },
        undefined,
      );
      endCursor = gqlRes.data.data.transactions?.pageInfo?.hasNextPage ? gqlRes.data.data.transactions.pageInfo.endCursor : null;
      txs.push(...gqlRes.data.data.transactions.edges.map((t) => t.node));
    } while (endCursor);

    return txs;
  }

  public async getProof(searchBy: {
    dataProtocol?: string;
    hashingAlgo?: string;
    dataHash?: string;
    uploadedFor?: string;
    prompt?: string;
    promptHash?: string;
    model?: string;
  }): Promise<ProvenanceProofGQLNode> {
    const res = (await this.getAllProofs(searchBy, { limit: 1 })).at(0);
    if (!res) throw new Error(`Unable to locate proof with fields ${JSON.stringify(searchBy)}`);
    return res;
  }
}

type ProvenanceProofGQLNode = Pick<TxGqlNode, "id" | "receipt" | "tags">;

const tagMap = {
  dataProtocol: "Data-Protocol",
  hashingAlgo: "Hashing-Algo",
  dataHash: "Data-Hash",
  uploadedFor: "Uploaded-For",
  prompt: "Prompt",
  promptHash: "Prompt-Hash",
  model: "Model",
};
