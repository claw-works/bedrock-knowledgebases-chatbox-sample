import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTableCommand,
  DescribeTableCommand,
  UpdateTimeToLiveCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = process.env.DYNAMODB_TABLE ?? "bedrock-kb-chatbox-sessions";
const TTL_SECONDS = 60 * 60 * 2; // 2 hours

export interface Session {
  sessionId: string;
  userId?: string;
  bedrockSessionId?: string;
  messages: Array<{ role: "user" | "assistant"; content: string; ts: number }>;
  createdAt: number;
  ttl: number;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { sessionId } })
  );
  return (result.Item as Session) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...session,
        ttl: Math.floor(Date.now() / 1000) + TTL_SECONDS,
      },
    })
  );
}

export async function ensureTable(): Promise<void> {
  try {
    await ddbClient.send(
      new CreateTableCommand({
        TableName: TABLE,
        KeySchema: [{ AttributeName: "sessionId", KeyType: "HASH" }],
        AttributeDefinitions: [
          { AttributeName: "sessionId", AttributeType: "S" },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
    );
    // Enable TTL separately — TimeToLiveSpecification is not part of CreateTableCommand
    await ddbClient.send(
      new UpdateTimeToLiveCommand({
        TableName: TABLE,
        TimeToLiveSpecification: {
          AttributeName: "ttl",
          Enabled: true,
        },
      })
    );
  } catch (e) {
    if (!(e instanceof ResourceInUseException)) throw e;
  }
}

/**
 * Ensure the userId-createdAt-index GSI exists on the table.
 * Non-blocking: if GSI is still CREATING, logs a warning and returns.
 */
export async function ensureGSI(): Promise<void> {
  try {
    const desc = await ddbClient.send(new DescribeTableCommand({ TableName: TABLE }));
    const existing = desc.Table?.GlobalSecondaryIndexes ?? [];
    const hasGSI = existing.some((g) => g.IndexName === "userId-createdAt-index");
    if (!hasGSI) {
      await ddbClient.send(
        new UpdateTableCommand({
          TableName: TABLE,
          AttributeDefinitions: [
            { AttributeName: "userId", AttributeType: "S" },
            { AttributeName: "createdAt", AttributeType: "N" },
          ],
          GlobalSecondaryIndexUpdates: [
            {
              Create: {
                IndexName: "userId-createdAt-index",
                KeySchema: [
                  { AttributeName: "userId", KeyType: "HASH" },
                  { AttributeName: "createdAt", KeyType: "RANGE" },
                ],
                Projection: { ProjectionType: "ALL" },
              },
            },
          ],
        })
      );
      console.warn(
        "[session] GSI userId-createdAt-index is being created (async, takes ~minutes). Scan fallback active."
      );
    }
  } catch (e) {
    console.warn("[session] ensureGSI failed (non-fatal):", e);
  }
}

/**
 * Query sessions by userId using the GSI.
 * Falls back to a filtered Scan if the GSI is not yet ACTIVE.
 */
export async function getSessionsByUser(
  userId: string,
  limit = 20
): Promise<Session[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (result.Items ?? []) as Session[];
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    // GSI may still be creating — fall back to Scan with filter
    if (
      errMsg.includes("index") ||
      errMsg.includes("GSI") ||
      errMsg.includes("CREATING") ||
      errMsg.includes("ResourceNotFoundException")
    ) {
      console.warn("[session] GSI not ready, falling back to Scan for userId:", userId);
      const fallback = await docClient.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
          Limit: 200,
        })
      );
      return (fallback.Items ?? [])
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, limit) as Session[];
    }
    throw e;
  }
}
