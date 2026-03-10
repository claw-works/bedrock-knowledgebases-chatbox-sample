import { NextRequest } from "next/server";
import { getSession, saveSession } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  if (!sessionId) {
    // Create new session
    const newId = uuidv4();
    // Pre-create with userId so history queries work from the start
    await saveSession({
      sessionId: newId,
      userId,
      messages: [],
      createdAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    }).catch(console.error);
    return Response.json({ sessionId: newId, messages: [], userId });
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
