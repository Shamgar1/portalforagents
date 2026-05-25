import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

export async function getSupabaseServerActionClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // #region agent log
        fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
          body: JSON.stringify({
            sessionId: "ad0d91",
            runId: "cookie-write",
            hypothesisId: "H2",
            location: "src/lib/supabase/server-action.ts:setAll",
            message: "supabase auth cookies setAll invoked",
            data: {
              cookieCount: cookiesToSet.length,
              cookieNames: cookiesToSet.map((cookie) => cookie.name),
              secureFlags: cookiesToSet.map((cookie) => cookie.options?.secure ?? null)
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}
