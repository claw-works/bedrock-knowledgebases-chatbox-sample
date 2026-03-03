import {
  DynamoDBClient,
  CreateTableCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = process.env.DYNAMODB_TABLE ?? "bedrock-kb-chatbox-sessions";
const TTL_SECONDS = 60 * 60 * 2; // 2 hours

export interface Session {
  sessionId: string;
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
