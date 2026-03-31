import express, { type Request, type Response } from "express";
import { queryGQL } from "arweavekit/graphql";

type ArweaveTransaction = {
  txid: string;
  uploaderAddress: string;
  blockHeight: number | null;
  timestamp: string | null;
  status: "confirmed" | "pending";
};

type ArweaveGraphQlEdge = {
  cursor: string;
  node: {
    id: string;
    owner: {
      address: string;
    };
    block: {
      height: number;
      timestamp: number;
    } | null;
  };
};

type ArweaveGraphQlResponse = {
  data?: {
    transactions?: {
      pageInfo?: {
        hasNextPage?: boolean;
      };
      edges?: ArweaveGraphQlEdge[];
    };
  };
};

const app = express();
const PORT = 3001; // Run on port 3001 to avoid conflicts main web app!

const WALLETS = [
  "-tFrKF2NuT5_X1cNOTHJmZw3xhss0K5WnXl3wYxRYLM"
  // "Add_More_Wallet_IDs_Here",
];

// Arweave GraphQL Query
const GQL_QUERY = `
  query getTransactions($owners: [String!], $after: String) {
    transactions(owners: $owners, first: 100, after: $after) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          id
          owner { address }
          block { height timestamp }
        }
      }
    }
  }
`;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

app.get("/api/index", async (_req: Request, res: Response) => {
  try {
    let allTransactions: ArweaveTransaction[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Query all WALLETS transcations, loop with cursor based pagnation enabled
    while (hasNextPage) {
      const response = (await queryGQL(GQL_QUERY, {
        gateway: "arweave.net",
        filters: {
          owners: WALLETS,
          after: cursor
        }
      })) as ArweaveGraphQlResponse;

      const data = response.data?.transactions;
      const edges = data?.edges;

      if (!edges || edges.length === 0) break; //Empty list returned in case results not found (or error)

      const formatted = edges.map((edge) => {
        const node = edge.node;
        const block = node.block;
        const isConfirmed = block !== null;

        return {
          txid: node.id,
          uploaderAddress: node.owner.address,
          blockHeight: block?.height ?? null,
          timestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
          status: isConfirmed ? "confirmed" : "pending"
        } satisfies ArweaveTransaction;
      });

      allTransactions = [...allTransactions, ...formatted];
      hasNextPage = Boolean(data.pageInfo?.hasNextPage);

      if (hasNextPage) {
        cursor = edges[edges.length - 1].cursor; // Access last element to fetch next page
      }
    }

    //Sort: descending timestamp. (Pending transactions go at the top.)
    allTransactions.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : Infinity;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : Infinity;
      return timeB - timeA;
    });

    res.json(allTransactions);
  } catch (error: unknown) {
    console.error(`[ERROR] Arweave Indexer: ${getErrorMessage(error)}`);

    // Return 503 JSON error body if gateway is unreachable
    res.status(503).json({
      error: "Arweave gateway unreachable",
      message: "The service could not connect to the Arweave network." 
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Arweave Indexer listening: http://localhost:${PORT}/api/index`);
});

// Endpoint to cleanly exit the API
app.get("/api/exit", (_req: Request, res: Response) => {
  console.log("Shutting down Arweave Indexer...");
  res.json({ message: "Shutting down server..." });
  server.close(() => {
    console.log("Arweave Indexer stopped.");
  });
});
