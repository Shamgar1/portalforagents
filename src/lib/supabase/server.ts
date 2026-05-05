import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

export async function getSupabaseServerReadOnlyClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Next.js only allows cookie mutations in Route Handlers or Server Actions.
        // This helper is intentionally read-focused for App Router server rendering.
        // Route Handlers and Server Actions should use the writable helper instead.
        void cookiesToSet;
      }
    }
  });
}

export const getSupabaseServerClient = getSupabaseServerReadOnlyClient;
