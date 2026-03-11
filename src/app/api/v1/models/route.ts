import { NextRequest } from "next/server";
import { isAuthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS = [
  {
    id: "bedrock-kb",
    object: "model",
    created: 1700000000,
    owned_by: "aws-bedrock",
  },
];

export async function GET(req: NextRequest) {
  if (!isAuthorized(req.headers)) {
    return new Response(JSON.stringify({ error: { message: "Unauthorized", type: "auth_error", code: 401 } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json({
    object: "list",
    data: MODELS,
  });
}
