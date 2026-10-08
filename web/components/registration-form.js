"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const config = {
  student: {
    endpoint: "/api/auth/register/student",
    title: "CADASTRAR ALUNO",
    submit: "CRIAR CONTA DE ALUNO",
    hint: "Aluno cria a própria conta e define a própria senha. Depois, entra na turma com o código fornecido pelo Mentor.",
  },
  mentor: {
    endpoint: "/api/auth/register/mentor",
    title: "CADASTRAR MENTOR",
    submit: "ATIVAR CREDENCIAL MTR",
    hint: "A credencial MTR é emitida por um Administrador. A senha é definida aqui pelo próprio Mentor e não pelo Administrador.",
  },
  invitation: {
    endpoint: "/api/auth/register/invitation",
    title: "ATIVAR CONVITE DE ALUNO",
    submit: "ATIVAR CONTA",
    hint: "Use este fluxo somente se o Mentor forneceu um código de convite individual. Para cadastro livre, use Cadastrar Aluno.",
  },
};

export default function RegistrationForm({ mode }) {
  const view = config[mode] || config.student;
  const [status, setStatus] = useState({ state: "checking", message: "VERIFICANDO JED SERVIDOR…" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", institution: "", institutional_id: "", credential_code: "", code: "", password: "", confirm: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/health", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setStatus(response.ok && data.ok
          ? { state: "ready", message: "JED SERVIDOR ACESSÍVEL" }
          : { state: "error", message: data.error || "JED SERVIDOR INDISPONÍVEL" });
      })
      .catch(() => { if (!cancelled) setStatus({ state: "error", message: "JED SERVIDOR INDISPONÍVEL" }); });
    return () => { cancelled = true; };
  }, []);

  const passwordsMatch = useMemo(() => form.password === form.confirm, [form.password, form.confirm]);
  function set(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (!passwordsMatch) { setError("As senhas não coincidem."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(view.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          institution: form.institution.trim(),
          institutional_id: form.institutional_id.trim(),
          credential_code: form.credential_code.trim().toUpperCase(),
          code: form.code.trim().toUpperCase(),
          password: form.password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir o cadastro.");
      window.location.assign(data.redirectTo || "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir o cadastro.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="orbit-auth-panel">
      <div className={`server-state server-state-${status.state}`}><span className="status-dot" />{status.message}</div>
      <div className="orbit-auth-heading"><span>JED ONLINE</span><h2>{view.title}</h2><p>{view.hint}</p></div>
      <form className="orbit-form" onSubmit={submit}>
        {mode !== "invitation" ? <>
          <label>NOME<input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required /></label>
          <label>E-MAIL<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></label>
        </> : null}
        {mode === "mentor" ? <label>INSTITUIÇÃO<input value={form.institution} onChange={(e) => set("institution", e.target.value)} /></label> : null}
        {mode !== "invitation" ? <label>{mode === "mentor" ? "ID INSTITUCIONAL (OPCIONAL)" : "MATRÍCULA / ID INSTITUCIONAL (OPCIONAL)"}<input value={form.institutional_id} onChange={(e) => set("institutional_id", e.target.value)} /></label> : null}
        {mode === "mentor" ? <label>CÓDIGO DE CREDENCIAMENTO<input className="code-input" value={form.credential_code} onChange={(e) => set("credential_code", e.target.value)} placeholder="MTR-XXXX-XXXX" required /></label> : null}
        {mode === "invitation" ? <label>CÓDIGO DO CONVITE<input className="code-input" value={form.code} onChange={(e) => set("code", e.target.value)} required /></label> : null}
        <div className="orbit-form-two">
          <label>CRIAR SENHA<input type="password" minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" required /></label>
          <label>REPETIR SENHA<input type="password" minLength={8} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" required /></label>
        </div>
        {form.confirm && !passwordsMatch ? <div className="form-error">As senhas não coincidem.</div> : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={submitting || status.state === "error"}>{submitting ? "PROCESSANDO…" : view.submit}</button>
      </form>
      <div className="orbit-auth-links">
        <Link href="/login">Já tenho uma conta</Link>
        {mode !== "student" ? <Link href="/cadastro/aluno">Cadastrar Aluno</Link> : null}
        {mode !== "mentor" ? <Link href="/cadastro/mentor">Cadastrar Mentor</Link> : null}
      </div>
    </div>
  );
}
