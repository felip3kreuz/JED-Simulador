"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState({ state: "checking", message: "VERIFICANDO JED SERVIDOR…" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/health", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && data.ok) setStatus({ state: "ready", message: "JED SERVIDOR ACESSÍVEL" });
        else setStatus({ state: "error", message: data.error || "JED SERVIDOR INDISPONÍVEL" });
      })
      .catch(() => { if (!cancelled) setStatus({ state: "error", message: "JED SERVIDOR INDISPONÍVEL" }); });
    return () => { cancelled = true; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") || ""), password: String(form.get("password") || "") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
      window.location.assign(data.redirectTo || "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível conectar à aplicação.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="orbit-auth-panel">
      <div className={`server-state server-state-${status.state}`}><span className="status-dot" />{status.message}</div>
      <div className="orbit-auth-heading"><span>JED ONLINE</span><h2>ENTRAR</h2><p>Use o e-mail e a senha da sua conta existente.</p></div>
      <form onSubmit={submit} className="orbit-form">
        <label>E-MAIL<input name="email" type="email" autoComplete="email" required /></label>
        <label>SENHA<input name="password" type="password" autoComplete="current-password" required /></label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={submitting || status.state === "error"}>{submitting ? "ENTRANDO…" : "ENTRAR"}</button>
      </form>
      <div className="orbit-auth-actions">
        <Link className="orbit-action-tile accent-cyan" href="/cadastro/aluno"><strong>CADASTRAR ALUNO</strong><span>Crie a própria conta e senha.</span></Link>
        <Link className="orbit-action-tile" href="/cadastro/mentor"><strong>CADASTRAR MENTOR</strong><span>Exige credencial MTR.</span></Link>
        <Link className="orbit-action-tile" href="/cadastro/convite"><strong>ATIVAR CONVITE DE ALUNO</strong><span>Compatibilidade com convite individual.</span></Link>
      </div>
    </div>
  );
}
