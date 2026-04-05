import { NextRequest } from "next/server";
import { getSession, deleteSession } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
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
  await deleteSession(sessionId);
  return Response.json({ ok: true });
}
