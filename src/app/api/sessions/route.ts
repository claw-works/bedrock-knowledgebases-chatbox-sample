import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE = process.env.DYNAMODB_TABLE ?? "bedrock-kb-chatbox-sessions";

export interface SessionSummary {
  sessionId: string;
  createdAt: number;
  preview: string;
}

/**
 * GET /api/sessions
 * Returns the 20 most recent sessions (by createdAt desc), each with a preview
 * of the first user message. No user isolation for now.
 */
export async function GET() {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        // Only fetch the fields we need
        ProjectionExpression: "sessionId, createdAt, messages",
      })
    );

    const summaries: SessionSummary[] = (result.Items ?? [])
      .filter((item) => Array.isArray(item.messages) && item.messages.length > 0)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 20)
      .map((item) => ({
        sessionId: item.sessionId as string,
        createdAt: item.createdAt as number,
        preview:
          (item.messages as Array<{ role: string; content: string }>)
            .find((m) => m.role === "user")
            ?.content.slice(0, 60) ?? "",
      }));

    return Response.json({ sessions: summaries });
  } catch (e) {
    console.error("Failed to list sessions:", e);
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
