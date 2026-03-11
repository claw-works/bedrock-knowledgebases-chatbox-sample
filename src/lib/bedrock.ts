import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateStreamCommand,
  RetrieveAndGenerateStreamCommandInput,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export interface StreamChunk {
  type: "text" | "citation" | "done" | "error";
  content?: string;
  citations?: Citation[];
  error?: string;
  sessionId?: string;
}

export interface Citation {
  generatedText: string;
  sources: CitationSource[];
}

export interface CitationSource {
  content: string;
  location?: string;
  title?: string;
}

/** Build the common RetrieveAndGenerate input. */
function buildInput(
  query: string,
  sessionId?: string,
  knowledgeBaseId?: string
): RetrieveAndGenerateStreamCommandInput {
  const kbId = knowledgeBaseId ?? process.env.KNOWLEDGE_BASE_ID;
  if (!kbId) throw new Error("KNOWLEDGE_BASE_ID not configured");
  return {
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: kbId,
        modelArn: process.env.BEDROCK_MODEL_ARN ?? "global.anthropic.claude-sonnet-4-6",
      },
    },
    ...(sessionId ? { sessionId } : {}),
  };
}

export async function* streamBedrockKBResponse(
  query: string,
  sessionId?: string,
  knowledgeBaseId?: string
): AsyncGenerator<StreamChunk> {
  let input: RetrieveAndGenerateStreamCommandInput;
  try {
    input = buildInput(query, sessionId, knowledgeBaseId);
  } catch (e) {
    yield { type: "error", error: (e as Error).message };
    return;
  }

  const command = new RetrieveAndGenerateStreamCommand(input);
  const response = await client.send(command);

  if (!response.stream) {
    yield { type: "error", error: "No stream in response" };
    return;
  }

  let newSessionId: string | undefined;

  for await (const event of response.stream) {
    if (event.output?.text) {
      yield { type: "text", content: event.output.text };
    }
    if (event.citation?.citation) {
      const raw = event.citation.citation;
      const citations: Citation[] = (raw.retrievedReferences ?? []).map(
        (ref) => ({
          generatedText: raw.generatedResponsePart?.textResponsePart?.text ?? "",
          sources: [
            {
              content: ref.content?.text ?? "",
              location: ref.location?.s3Location?.uri ?? ref.location?.webLocation?.url,
              title: ref.metadata?.["title"] as string | undefined,
            },
          ],
        })
      );
      if (citations.length > 0) {
        yield { type: "citation", citations };
      }
    }
    if ((event as unknown as Record<string, unknown>).sessionId) {
      newSessionId = (event as unknown as Record<string, unknown>).sessionId as string;
    }
  }

  yield { type: "done", sessionId: newSessionId };
}

/** Non-streaming version — returns full text + sessionId. */
export async function invokeBedrockKBResponse(
  query: string,
  sessionId?: string,
  knowledgeBaseId?: string
): Promise<{ text: string; sessionId?: string }> {
  const input = buildInput(query, sessionId, knowledgeBaseId);
  // RetrieveAndGenerateCommand (non-streaming)
  const command = new RetrieveAndGenerateCommand(input as Parameters<typeof RetrieveAndGenerateCommand>[0]);
  const response = await client.send(command);
  return {
    text: response.output?.text ?? "",
    sessionId: response.sessionId,
  };
}


const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export interface StreamChunk {
  type: "text" | "citation" | "done" | "error";
  content?: string;
  citations?: Citation[];
  error?: string;
  sessionId?: string;
}

export interface Citation {
  generatedText: string;
  sources: CitationSource[];
}

export interface CitationSource {
  content: string;
  location?: string;
  title?: string;
}

export async function* streamBedrockKBResponse(
  query: string,
  sessionId?: string,
  knowledgeBaseId?: string
): AsyncGenerator<StreamChunk> {
  const kbId = knowledgeBaseId ?? process.env.KNOWLEDGE_BASE_ID;
  if (!kbId) {
    yield { type: "error", error: "KNOWLEDGE_BASE_ID not configured" };
    return;
  }

  const input: RetrieveAndGenerateStreamCommandInput = {
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: kbId,
        modelArn: "global.anthropic.claude-sonnet-4-6",
      },
    },
    ...(sessionId ? { sessionId } : {}),
  };

  const command = new RetrieveAndGenerateStreamCommand(input);
  const response = await client.send(command);

  if (!response.stream) {
    yield { type: "error", error: "No stream in response" };
    return;
  }

  let newSessionId: string | undefined;

  for await (const event of response.stream) {
    if (event.output?.text) {
      yield { type: "text", content: event.output.text };
    }
    if (event.citation?.citation) {
      const raw = event.citation.citation;
      const citations: Citation[] = (raw.retrievedReferences ?? []).map(
        (ref) => ({
          generatedText: raw.generatedResponsePart?.textResponsePart?.text ?? "",
          sources: [
            {
              content: ref.content?.text ?? "",
              location: ref.location?.s3Location?.uri ?? ref.location?.webLocation?.url,
              title: ref.metadata?.["title"] as string | undefined,
            },
          ],
        })
      );
      if (citations.length > 0) {
        yield { type: "citation", citations };
      }
    }
    // Capture sessionId from the stream
    if ((event as unknown as Record<string, unknown>).sessionId) {
      newSessionId = (event as unknown as Record<string, unknown>).sessionId as string;
    }
  }

  yield { type: "done", sessionId: newSessionId };
}

// ─── Two-step RAG: Retrieve + OpenAI Generate ───────────────────────────────

export interface RetrievedChunk {
  content: string;
  location?: string;
  title?: string;
  score?: number;
}

/** Step 1: Retrieve relevant chunks from Bedrock KB (no generation). */
export async function retrieveBedrockKB(
  query: string,
  knowledgeBaseId?: string,
  maxResults = 5
): Promise<RetrievedChunk[]> {
  const kbId = knowledgeBaseId ?? process.env.KNOWLEDGE_BASE_ID;
  if (!kbId) throw new Error("KNOWLEDGE_BASE_ID not configured");

  const command = new RetrieveCommand({
    knowledgeBaseId: kbId,
    retrievalQuery: { text: query },
    retrievalConfiguration: {
      vectorSearchConfiguration: { numberOfResults: maxResults },
    },
  });

  const response = await client.send(command);
  return (response.retrievalResults ?? []).map((r) => ({
    content: r.content?.text ?? "",
    location: r.location?.s3Location?.uri ?? r.location?.webLocation?.url,
    title: r.metadata?.["title"] as string | undefined,
    score: r.score,
  }));
}

/** Step 2 (streaming): Generate answer using an OpenAI-compatible API. */
export async function* generateWithOpenAIStream(
  query: string,
  chunks: RetrievedChunk[]
): AsyncGenerator<StreamChunk> {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!baseUrl || !apiKey) {
    yield { type: "error", error: "OPENAI_BASE_URL or OPENAI_API_KEY not configured" };
    return;
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1}]${c.title ? ` ${c.title}` : ""}\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful assistant. Answer the user's question based on the provided context. 
If the answer is not in the context, say so honestly.

Context:
${context}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    yield { type: "error", error: `OpenAI API error: ${res.status} ${err}` };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { yield { type: "error", error: "No response body" }; return; }

  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") { yield { type: "done" }; return; }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield { type: "text", content };
        if (parsed.choices?.[0]?.finish_reason === "stop") yield { type: "done" };
      } catch { /* skip malformed */ }
    }
  }

  yield { type: "done" };
}

/** Step 2 (non-streaming): Generate answer using an OpenAI-compatible API. */
export async function generateWithOpenAI(
  query: string,
  chunks: RetrievedChunk[]
): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!baseUrl || !apiKey) throw new Error("OPENAI_BASE_URL or OPENAI_API_KEY not configured");

  const context = chunks
    .map((c, i) => `[Source ${i + 1}]${c.title ? ` ${c.title}` : ""}\n${c.content}`)
    .join("\n\n");

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Answer based on the context below.\n\nContext:\n${context}`,
        },
        { role: "user", content: query },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Returns true if two-step RAG (Retrieve + OpenAI Generate) is configured. */
export function isTwoStepRagConfigured(): boolean {
  return !!(process.env.OPENAI_BASE_URL && process.env.OPENAI_API_KEY);
}
