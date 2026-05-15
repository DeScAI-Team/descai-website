import { TurboFactory } from "@ardrive/turbo-sdk/web";


const APP_NAME = "DeScAi";
const WANDER_COMMENT_PERMISSIONS = ["ACCESS_ADDRESS", "SIGN_TRANSACTION"] as const;
// Export so we can use in ReviewPage consistantly
export const WANDER_COMMENT_CONNECT_MESSAGE = "Please connect Wander to write comments"; 
export const TURBO_COMMENT_TOO_LONG_MESSAGE = "Comment is too long for Turbo free upload. Please keep it under 100kb.";

export interface ArweaveComment {
  txid?: string;
  owner?: string;
  text: string;
  timestamp: number;
  rootTx: string;
}

type ArweaveGraphQlEdge = {
  node: {
    id: string;
    owner: { address: string };
    tags: Array<{ name: string; value: string }>;
  };
};

type ArweaveGraphQlResponse = {
  data?: {
    transactions?: {
      edges?: ArweaveGraphQlEdge[];
    };
  };
  errors?: Array<{ message?: string }>;
};

type PublishCommentOptions = {
  wallet?: Window["arweaveWallet"];
  owner?: string | null;
};

const getByteLength = (value: string) => new TextEncoder().encode(value).byteLength;
const toUint8Array = (value: ArrayBuffer | Uint8Array | number[]) => {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  return new Uint8Array(value);
};

/**
 * Upload a comment to Arweave through Turbo with the connected Wander wallet.
 * @param reviewTxId TxID of the review
 * @param commentText Comment Text
 * @returns The uploaded comment metadata
 */
export const publishComment = async (
  reviewTxId: string,
  commentText: string,
  options: PublishCommentOptions = {}
): Promise<ArweaveComment> => {
  try {
    const wallet = options.wallet ?? window.arweaveWallet;
    if (!wallet) {
      throw new Error(WANDER_COMMENT_CONNECT_MESSAGE);
    }

    await wallet.connect([...WANDER_COMMENT_PERMISSIONS]);

    const owner = options.owner ?? await wallet.getActiveAddress().catch(() => null);
    if (!owner) {
      throw new Error(WANDER_COMMENT_CONNECT_MESSAGE);
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const commentData = { text: commentText, timestamp, rootTx: reviewTxId };
    const data = JSON.stringify(commentData);

    if (getByteLength(data) >= 100 * 1024) {
      throw new Error(TURBO_COMMENT_TOO_LONG_MESSAGE);
    }

    const signedDataItem = toUint8Array(await wallet.signDataItem({
      data,
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "App-Name", value: APP_NAME },
        { name: "Type", value: "comment" },
        { name: "Root-Tx", value: reviewTxId },
        { name: "Unix-Time", value: timestamp.toString() }
      ]
    }));

    const turbo = TurboFactory.unauthenticated();

    const uploadResult = await turbo.uploadSignedDataItem({
      dataItemStreamFactory: () => new Blob([signedDataItem]).stream(),
      dataItemSizeFactory: () => signedDataItem.byteLength
    });

    return {
      txid: uploadResult.id,
      owner: uploadResult.owner || owner,
      text: commentText,
      timestamp,
      rootTx: reviewTxId
    };
  } catch (err) {
    console.error("Turbo comment upload failed:", err);
    throw err;
  }
};

/**
 * Fetches all commment fors a specific review
 * @param reviewTxId TxID of the reveiw 
 * @returns A JSON Array of each comments': TxId, Wallet Address, Timestamp, Tags, and post's TxId
 */
export const fetchComments = async (reviewTxId: string): Promise<ArweaveComment[]> => {
    const query = {
        query: `
            query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${APP_NAME}"] },
                        { name: "Type", values: ["comment"] },
                        { name: "Root-Tx", values: ["${reviewTxId}"]}
                    ],
                    sort: HEIGHT_ASC    
                ) {
                    edges {
                        node {
                            id
                            owner { address }
                            tags { name value }
                        }
                    }
                }    
            } `
    };

    const response = await fetch("https://arweave.net/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(query)
    });

    const resData = await response.json() as ArweaveGraphQlResponse;
    const graphQlError = resData.errors?.find((error) => error.message)?.message;
    if (graphQlError) {
        throw new Error(graphQlError);
    }

    const edges = resData.data?.transactions?.edges ?? [];

    const comments: Array<ArweaveComment | null> = await Promise.all(edges.map(async (edge) => {
        const txid = edge.node.id;
        try {
            const bodyRes = await fetch(`https://arweave.net/${txid}`);
            if(!bodyRes.ok) return null;

            const body = await bodyRes.json() as Partial<ArweaveComment>;
            if (typeof body.text !== "string" || typeof body.timestamp !== "number") {
                return null;
            }

            return {
                txid,
                owner: edge.node.owner.address,
                text: body.text,
                timestamp: body.timestamp,
                rootTx: reviewTxId
            };
        } catch {
            return null;
        }
    }));

    // Filter out failed fetches or missing bodies
    return comments.filter((c): c is ArweaveComment => c !== null);
}
