import { NextResponse } from "next/server";

import { getSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function POST() {
  const supabase = await getSupabaseServerActionClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
