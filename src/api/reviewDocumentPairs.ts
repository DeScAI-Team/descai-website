import {
  buildProjectMatchKeyFromTags,
  fetchArweaveTransactionTags,
  fetchIndexTransactions,
  parseDocTypeFromTags
} from "@/api/arweaveLoader";
import { getArweaveGatewayBaseUrl, getOverviewAgentAddress } from "@/api/fetchOverviewSidebarsFromArweave";
import type { ReviewDocType } from "@/types/review";

type ArweaveTag = { name: string; value: string };

export type { ReviewDocType };

export type PairedDocumentTxids = {
  docType: ReviewDocType | null;
  overviewTxid: string | null;
  reviewTxid: string | null;
};

const AGENT_TX_QUERY = `
  query AgentDocTypeTxs($owners: [String!]!, $tags: [TagFilter!]!, $after: String) {
    transactions(owners: $owners, tags: $tags, first: 100, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
        }
      }
    }
  }
`;

type TaggedTransaction = { txid: string; tags: ArweaveTag[] };

const collectTaggedTransactions = async (): Promise<TaggedTransaction[]> => {
  const byTxid = new Map<string, TaggedTransaction>();

  const indexTransactions = await fetchIndexTransactions();
  for (const transaction of indexTransactions) {
    const txid = transaction.txid ?? transaction.id;
    if (!txid) continue;
    byTxid.set(txid, { txid, tags: transaction.tags ?? [] });
  }

  const agentAddress = getOverviewAgentAddress();
  if (agentAddress) {
    for (const docType of ["overview", "review"] as const) {
      const gatewayBase = getArweaveGatewayBaseUrl();
      const graphqlUrl = `${gatewayBase}/graphql`;
      let cursor: string | null = null;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await fetch(graphqlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            query: AGENT_TX_QUERY,
            variables: {
              owners: [agentAddress],
              tags: [{ name: "doctype", values: [docType] }],
              after: cursor
            }
          })
        });

        if (!response.ok) {
          break;
        }

        const payload = (await response.json()) as {
          data?: {
            transactions?: {
              pageInfo?: { hasNextPage?: boolean };
              edges?: Array<{ cursor: string; node: { id: string; tags: ArweaveTag[] } }>;
            };
          };
        };

        const page = payload.data?.transactions;
        const batch = page?.edges ?? [];
        if (!batch.length) {
          break;
        }

        for (const edge of batch) {
          byTxid.set(edge.node.id, { txid: edge.node.id, tags: edge.node.tags ?? [] });
        }

        hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
        cursor = batch[batch.length - 1]?.cursor ?? null;
        if (!hasNextPage || !cursor) {
          break;
        }
      }
    }
  }

  return [...byTxid.values()];
};

export async function resolvePairedDocumentTxids(txid: string, tags?: ArweaveTag[]): Promise<PairedDocumentTxids> {
  const resolvedTags = tags ?? (await fetchArweaveTransactionTags(txid).catch(() => [] as ArweaveTag[]));
  const docType = parseDocTypeFromTags(resolvedTags);
  const matchKey = buildProjectMatchKeyFromTags(resolvedTags);

  let overviewTxid: string | null = docType === "overview" ? txid : null;
  let reviewTxid: string | null = docType === "review" ? txid : null;

  if (!matchKey) {
    return { docType, overviewTxid, reviewTxid };
  }

  const transactions = await collectTaggedTransactions();

  for (const transaction of transactions) {
    const transactionDocType = parseDocTypeFromTags(transaction.tags);
    if (!transactionDocType) continue;

    const transactionKey = buildProjectMatchKeyFromTags(transaction.tags);
    if (transactionKey !== matchKey) continue;

    if (transactionDocType === "overview") {
      overviewTxid = transaction.txid;
    } else {
      reviewTxid = transaction.txid;
    }
  }

  return { docType, overviewTxid, reviewTxid };
}
