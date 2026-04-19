"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginState = {
  error: string | null;
  loading: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({ error: null, loading: false });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    setState({ error: null, loading: true });

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setState({ error: payload.error ?? "אימייל או סיסמה שגויים.", loading: false });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="card login-card" onSubmit={handleSubmit}>
      <div className="login-header">
        <div className="login-logo">
          <div className="login-logo-mark">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 8h12M8 2v12" />
            </svg>
          </div>
          פורטל סוכנים
        </div>
        <h1 className="login-title">כניסה לחשבון</h1>
        <p className="login-subtitle">הזינו את פרטי המשתמש שהוגדרו עבורכם ב-Supabase כדי להיכנס לפורטל.</p>
      </div>

      <div className="login-fields">
        <div className="field">
          <label className="field-label" htmlFor="email">כתובת אימייל</label>
          <input
            className="field-input"
            id="email"
            name="email"
            type="email"
            placeholder="sarah@agency.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">סיסמה</label>
          <input
            className="field-input"
            id="password"
            name="password"
            type="password"
            placeholder="הזינו סיסמה"
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {state.error ? (
        <div className="error-banner" role="alert">
          {state.error}
        </div>
      ) : null}

      <button className="btn btn-primary" type="submit" disabled={state.loading} style={{ width: "100%", padding: "13px" }}>
        {state.loading ? "מתחבר..." : "כניסה"}
      </button>
    </form>
  );
}
