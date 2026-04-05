import { isTwoStepRagConfigured } from "@/lib/bedrock";

export async function GET() {
  const twoStep = isTwoStepRagConfigured();
  const modelName = twoStep
    ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini")
    : (process.env.BEDROCK_MODEL_ARN ?? "global.anthropic.claude-sonnet-4-6");

  return Response.json({ modelName, twoStepRag: twoStep });
}
