export const AUTH_KEY = "kb_api_key";

/** Returns the stored API key, or null if not authenticated (client-side only). */
export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEY);
}

/** Persists the API key to localStorage. */
export function setStoredApiKey(key: string): void {
  localStorage.setItem(AUTH_KEY, key);
}

/** Clears the stored API key (logout). */
export function clearStoredApiKey(): void {
  localStorage.removeItem(AUTH_KEY);
}

/** Validates an API key against the server. Returns true if valid. */
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/validate", {
      method: "POST",
      headers: { "x-api-key": key },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Server-side: extract API key from request headers.
 * Supports both:
 *   - x-api-key: <key>
 *   - Authorization: Bearer <key>
 */
export function extractApiKey(headers: Headers): string | null {
  // x-api-key takes precedence
  const xApiKey = headers.get("x-api-key");
  if (xApiKey) return xApiKey;

  // Authorization: Bearer <token>
  const auth = headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

/**
 * Server-side: validate a request's API key against the configured API_KEY env var.
 * Returns true if auth passes (no key configured = always pass).
 */
export function isAuthorized(headers: Headers): boolean {
  const expected = process.env.API_KEY;
  if (!expected) return true; // no key configured, open access
  const provided = extractApiKey(headers);
  return provided === expected;
}
