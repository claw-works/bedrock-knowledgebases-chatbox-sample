import { NextRequest } from "next/server";
import { getSession, saveSession } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    // Create new session
    const newId = uuidv4();
    return Response.json({ sessionId: newId, messages: [] });
  }
  const session = await getSession(sessionId);
  return Response.json(session ?? { sessionId, messages: [] });
}

export async function DELETE(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }
  // Reset: save empty session (TTL will eventually clean up)
  await saveSession({
    sessionId,
    messages: [],
    createdAt: Date.now(),
    ttl: 0,
  });
  return Response.json({ ok: true });
}
