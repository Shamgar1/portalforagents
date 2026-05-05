export async function getSessionUser() {
  try {
    const [{ buildSessionUser, mapProfileRow }, { getSupabaseServerReadOnlyClient }] = await Promise.all([
      import("@/lib/auth/user"),
      import("@/lib/supabase/server")
    ]);
    const supabase = await getSupabaseServerReadOnlyClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return buildSessionUser(user.email, mapProfileRow(profile));
  } catch {
    return null;
  }
}
