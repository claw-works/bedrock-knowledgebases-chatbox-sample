import { NextRequest } from "next/server";
import { listSessions, ensureTable } from "@/lib/session";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  try {
    await ensureTable();
    const sessions = await listSessions(userId);
    return Response.json({ sessions });
  } catch (e) {
    console.error("Failed to list sessions:", e);
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
