import { NextRequest } from "next/server";

/**
 * Lightweight API-key validation endpoint.
 * Does NOT invoke Bedrock — just checks the key against the env var.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return new Response(JSON.stringify({ valid: false, error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ valid: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
