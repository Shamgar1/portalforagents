"use client";

import { FormEvent, useState } from "react";

type LoginState = {
  error: string | null;
  loading: boolean;
};

export function LoginForm() {
  const [state, setState] = useState<LoginState>({ error: null, loading: false });

  async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    setState({ error: null, loading: true });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "אימייל או סיסמה שגויים.");
        setState({ error: message, loading: false });
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!sessionResponse.ok) {
        const message = await parseErrorMessage(
          sessionResponse,
          "התחברת בהצלחה, אבל לא נפתחה סשן פעילה. נסו לרענן ולהתחבר שוב."
        );
        setState({ error: message, loading: false });
        return;
      }

      // Hard navigation avoids stale client router state right after auth cookie writes.
      window.location.assign("/dashboard");
    } catch {
      setState({
        error: "שגיאת תקשורת בעת התחברות. בדקו חיבור ונסו שוב.",
        loading: false
      });
    }
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
