"use client";

import { useEffect, useState } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState({ state: "checking", message: "Verificando JED Servidor…" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/health", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && data.ok) {
          setStatus({ state: "ready", message: "JED Servidor acessível" });
        } else {
          setStatus({ state: "error", message: data.error || "JED Servidor indisponível" });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: "error", message: "JED Servidor indisponível" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível entrar.");
        return;
      }
      window.location.assign(data.redirectTo || "/");
    } catch {
      setError("Não foi possível conectar à aplicação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-card">
      <div className={`server-state server-state-${status.state}`}>
        <span className="status-dot" />
        {status.message}
      </div>

      <form onSubmit={submit} className="login-form">
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Senha
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="login-note">
        A credencial é enviada apenas ao backend do JED Web. O token do JED Servidor fica em cookie
        HttpOnly e não é exposto ao JavaScript da página.
      </p>
    </div>
  );
}
