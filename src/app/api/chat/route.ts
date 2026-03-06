import { NextRequest } from "next/server";
import { streamBedrockKBResponse } from "@/lib/bedrock";
import { getSession, saveSession, ensureTable, Session } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  // Simple API key auth
  const apiKey = req.headers.get("x-api-key");
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return unauthorized();
  }

  const { query, sessionId: incomingSessionId, kbId } = await req.json();
  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ensureTable();
  const sessionId = incomingSessionId ?? uuidv4();
  const session: Session = (await getSession(sessionId)) ?? {
    sessionId,
    messages: [],
    createdAt: Date.now(),
    ttl: 0,
  };

  // Add user message
  session.messages.push({ role: "user", content: query, ts: Date.now() });

  const encoder = new TextEncoder();
  let assistantText = "";
  let newBedrockSessionId: string | undefined = session.bedrockSessionId;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send sessionId so the client can persist it
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "session", sessionId })}\n\n`
          )
        );

        for await (const chunk of streamBedrockKBResponse(
          query,
          session.bedrockSessionId,
          kbId
        )) {
          if (chunk.type === "text") {
            assistantText += chunk.content ?? "";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          } else if (chunk.type === "citation") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          } else if (chunk.type === "done") {
            newBedrockSessionId = chunk.sessionId ?? newBedrockSessionId;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          } else if (chunk.type === "error") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
      } finally {
        // Persist session
        session.bedrockSessionId = newBedrockSessionId;
        session.messages.push({
          role: "assistant",
          content: assistantText,
          ts: Date.now(),
        });
        await saveSession(session).catch(console.error);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
