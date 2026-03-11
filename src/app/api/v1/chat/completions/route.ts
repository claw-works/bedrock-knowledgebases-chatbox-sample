import { NextRequest } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { streamBedrockKBResponse, invokeBedrockKBResponse } from "@/lib/bedrock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  /** Custom extension: pass an existing Bedrock session ID for multi-turn context */
  session_id?: string;
  /** Custom extension: override Knowledge Base ID */
  knowledge_base_id?: string;
}

function unauthorized() {
  return new Response(
    JSON.stringify({ error: { message: "Unauthorized", type: "auth_error", code: 401 } }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

function badRequest(msg: string) {
  return new Response(
    JSON.stringify({ error: { message: msg, type: "invalid_request_error", code: 400 } }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

/** Extract the last user message from the messages array. */
function extractUserQuery(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content?.trim()) {
      return messages[i].content.trim();
    }
  }
  return null;
}

const MODEL_ID = "bedrock-kb";
const now = () => Math.floor(Date.now() / 1000);

export async function POST(req: NextRequest) {
  if (!isAuthorized(req.headers)) return unauthorized();

  let body: ChatCompletionRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { messages, stream = false, session_id, knowledge_base_id } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return badRequest("messages is required and must be a non-empty array");
  }

  const query = extractUserQuery(messages);
  if (!query) return badRequest("No user message found in messages");

  const completionId = `chatcmpl-${Date.now()}`;
  const created = now();

  if (stream) {
    // === Streaming response (SSE) ===
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          let fullText = "";

          for await (const chunk of streamBedrockKBResponse(query, session_id, knowledge_base_id)) {
            if (chunk.type === "error") {
              send({
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model: MODEL_ID,
                choices: [{ index: 0, delta: { content: `[Error: ${chunk.error}]` }, finish_reason: null }],
              });
              break;
            }
            if (chunk.type === "text" && chunk.content) {
              fullText += chunk.content;
              send({
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model: MODEL_ID,
                choices: [{ index: 0, delta: { content: chunk.content }, finish_reason: null }],
              });
            }
            if (chunk.type === "done") {
              // Final chunk with finish_reason
              send({
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model: MODEL_ID,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                // Custom extension: pass back Bedrock session ID
                ...(chunk.sessionId ? { bedrock_session_id: chunk.sessionId } : {}),
              });
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          send({
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model: MODEL_ID,
            choices: [{ index: 0, delta: { content: `[Error: ${msg}]` }, finish_reason: "stop" }],
          });
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // === Non-streaming response ===
    try {
      const { text, sessionId: newSessionId } = await invokeBedrockKBResponse(
        query,
        session_id,
        knowledge_base_id
      );

      return Response.json({
        id: completionId,
        object: "chat.completion",
        created,
        model: MODEL_ID,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        // Custom extension
        ...(newSessionId ? { bedrock_session_id: newSessionId } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({ error: { message: msg, type: "api_error", code: 500 } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
