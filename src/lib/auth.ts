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
