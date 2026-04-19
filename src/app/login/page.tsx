import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-page">
        <section className="card login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-mark">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 8h12M8 2v12" />
                </svg>
              </div>
              פורטל סוכנים
            </div>
            <h1 className="login-title">נדרש חיבור ל-Supabase</h1>
            <p className="login-subtitle">
              כדי להפעיל התחברות אמיתית והרשאות לפי סוכן, יש להוסיף ערכים לקובץ הסביבה.
            </p>
          </div>

          <div className="demo-block" style={{ direction: "ltr", textAlign: "left" }}>
            <p className="demo-block-title">.env.local</p>
            <div className="demo-cred">
              <span className="demo-email">NEXT_PUBLIC_SUPABASE_URL</span>
            </div>
            <div className="demo-cred">
              <span className="demo-email">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-page">
      <LoginForm />
    </div>
  );
}
