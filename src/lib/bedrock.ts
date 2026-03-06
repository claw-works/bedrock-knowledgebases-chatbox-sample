import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateStreamCommand,
  RetrieveAndGenerateStreamCommandInput,
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
