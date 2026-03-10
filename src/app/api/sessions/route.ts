import { NextRequest } from "next/server";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getSessionsByUser } from "@/lib/session";

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
 * - With ?userId=xxx: returns sessions for that user (via GSI, with Scan fallback)
 * - Without userId: returns 20 most recent sessions (full Scan, admin/backward-compat)
 */
export async function GET(req: NextRequest) {
  // API key auth (same pattern as /api/chat)
  const apiKey = req.headers.get("x-api-key");
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");

  try {
    if (userId) {
      const sessions = await getSessionsByUser(userId);
      const summaries: SessionSummary[] = sessions
        .filter((s) => Array.isArray(s.messages) && s.messages.length > 0)
        .map((s) => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          preview:
            s.messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? "",
        }));
      return Response.json({ sessions: summaries });
    }

    // No userId: full scan (admin / backward-compat)
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "sessionId, createdAt, messages",
        // TODO: replace with GSI on createdAt when user isolation is added
        Limit: 200,
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
