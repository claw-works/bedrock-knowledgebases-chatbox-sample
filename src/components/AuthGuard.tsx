"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getStoredApiKey } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side route guard.
 * If server has no API_KEY configured, skip auth entirely (open access).
 * Otherwise redirect unauthenticated users to /login.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Check if server requires auth at all
      try {
        const res = await fetch("/api/auth/validate", { method: "POST" });
        if (res.ok) {
          // No API_KEY configured on server — open access
          setReady(true);
          return;
        }
      } catch {}

      // Server requires auth — check localStorage
      const key = getStoredApiKey();
      if (!key && !pathname.endsWith("/login")) {
        const params = searchParams.toString();
        router.replace(`/login${params ? `?${params}` : ""}`);
      } else {
        setReady(true);
      }
    })();
  }, [pathname, router, searchParams]);

  if (!ready) return null;

  return <>{children}</>;
}
