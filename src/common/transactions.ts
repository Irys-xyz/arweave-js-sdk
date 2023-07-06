import type { AxiosResponse } from "axios";
import type Irys from "./irys";
import type { TxGqlNode, TxGqlResponse } from "./types";

export class Transaction {
  protected irys: Irys;
  constructor(irys: Irys) {
    this.irys = irys;
  }

  public async getById(id: string): Promise<TxGqlNode> {
    const res = (await this.query({ ids: [id], limit: 1 })).at(0);
    if (!res) throw new Error(`Unable to locate tx with id ${id}`);
    return res;
  }

  public async getByOwner(owner: string): Promise<TxGqlNode> {
    const res = (await this.query({ owners: [owner], limit: 1 })).at(0);
    if (!res) throw new Error(`Unable to locate tx with owner ${owner}`);
    return res;
  }

  public async getByTag(name: string, value: string): Promise<TxGqlNode> {
    const res = (await this.query({ tags: [{ name, values: [value] }], limit: 1 })).at(0);
    if (!res) throw new Error(`Unable to locate tx with tag ${name}:${value}`);
    return res;
  }

  public async query(parameters: {
    order?: "desc" | "asc";
    ids?: string[];
    limit?: number;
    after?: string;
    currency?: string;
    owners?: string[];
    hasTags?: boolean;
    tags?: { name: string; values: string[] }[];
  }): Promise<TxGqlNode[]> {
    // full bundler node GQL query
    const query = `
    query ($ids: [String!], $after: String, $currency: String, $owners: [String!], $limit: Int, $order: SortOrder, $hasTags: Boolean, $tags: [TagFilter!]) {
      transactions(ids: $ids, after: $after, currency: $currency, owners: $owners, limit: $limit, order: $order, hasTags: $hasTags, tags: $tags) {
        edges {
          cursor
          node {
            address
            currency
            id
            receipt {
              deadlineHeight
              signature
              timestamp
              version
            }
            signature
            tags {
              name
              value
            }
            timestamp
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
    `;
    const txs: TxGqlNode[] = [];
    let endCursor: string | null = null;
    do {
      const gqlRes: AxiosResponse<TxGqlResponse> = await this.irys.api.post(
        "/graphql",
        {
          query,
          variables: { ...parameters, after: endCursor ?? parameters.after },
        },
        undefined,
      );
      endCursor = gqlRes.data.data.transactions?.pageInfo?.hasNextPage ? gqlRes.data.data.transactions.pageInfo.endCursor : null;
      txs.push(...gqlRes.data.data.transactions.edges.map((t) => t.node));
    } while (endCursor);

    return txs;
  }
}
