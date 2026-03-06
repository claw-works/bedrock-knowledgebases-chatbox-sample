"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredApiKey } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side route guard.
 * Redirects unauthenticated users to /login.
 * Shows nothing while checking (avoids flash of protected content).
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = getStoredApiKey();
    if (!key && pathname !== "/login") {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (!ready) {
    // Blank screen while checking — avoids flash of protected content
    return null;
  }

  return <>{children}</>;
}
