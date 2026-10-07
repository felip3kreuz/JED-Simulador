"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminWorkspace({ user }) {
  const [data, setData] = useState({ users: [], mentor_invitations: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [mentorForm, setMentorForm] = useState({ name: "", email: "", institution: "", institutional_id: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar administração.");
      setData({ users: Array.isArray(payload.users) ? payload.users : [], mentor_invitations: Array.isArray(payload.mentor_invitations) ? payload.mentor_invitations : [] });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao carregar administração."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    admins: data.users.filter((u) => u.role === "admin").length,
    mentors: data.users.filter((u) => u.role === "mentor" || u.role === "tutor").length,
    students: data.users.filter((u) => u.role === "aluno").length,
  }), [data.users]);

  async function action(input, label = "Operação concluída.") {
    setBusy(input.action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha na operação.");
      const code = payload.result?.code ? ` Código: ${payload.result.code}` : "";
      setNotice(label + code);
      await load();
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha na operação."); return false; }
    finally { setBusy(""); }
  }

  async function createAdmin(event) {
    event.preventDefault();
    if (await action({ action: "create_admin", ...adminForm }, "Administrador criado.")) setAdminForm({ name: "", email: "", password: "" });
  }
  async function inviteMentor(event) {
    event.preventDefault();
    if (await action({ action: "mentor_invitation", ...mentorForm }, "Credencial de Mentor criada.")) setMentorForm({ name: "", email: "", institution: "", institutional_id: "" });
  }

  if (loading) return <section className="workspace-loading">Carregando usuários e permissões…</section>;

  return <>
    <section className="workspace-hero"><div><p className="eyebrow">Administração</p><h1>Painel do Administrador</h1><p className="lede">Gerencie contas, permissões de Mentor e credenciais do JED Servidor.</p></div><div className="workspace-summary"><strong>{stats.admins}</strong><span>admins</span><strong>{stats.mentors}</strong><span>mentores</span><strong>{stats.students}</strong><span>alunos</span></div></section>
    {error ? <div className="workspace-alert workspace-alert-error">{error}</div> : null}{notice ? <div className="workspace-alert workspace-alert-success">{notice}</div> : null}

    <section className="workspace-two-col">
      <article className="workspace-card"><p className="eyebrow">Administração</p><h2>Novo Administrador</h2><form className="compact-form" onSubmit={createAdmin}><label>Nome<input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} required /></label><label>E-mail<input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required /></label><label>Senha inicial<input type="password" minLength={8} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required /></label><button className="primary-button" disabled={Boolean(busy)}>Criar Administrador</button></form></article>
      <article className="workspace-card"><p className="eyebrow">Mentoria</p><h2>Credencial de Mentor</h2><form className="compact-form" onSubmit={inviteMentor}><label>Nome<input value={mentorForm.name} onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })} required /></label><label>E-mail<input type="email" value={mentorForm.email} onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })} required /></label><label>Instituição<input value={mentorForm.institution} onChange={(e) => setMentorForm({ ...mentorForm, institution: e.target.value })} /></label><label>ID institucional<input value={mentorForm.institutional_id} onChange={(e) => setMentorForm({ ...mentorForm, institutional_id: e.target.value })} /></label><button className="primary-button" disabled={Boolean(busy)}>Gerar credencial</button></form></article>
    </section>

    <section className="workspace-section"><div className="workspace-section-head"><div><p className="eyebrow">Contas</p><h2>Usuários do servidor</h2></div><button className="secondary-button" onClick={load}>Atualizar</button></div><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Nome</th><th>Papel</th><th>E-mail</th><th>Status</th><th>Permissões</th></tr></thead><tbody>{data.users.map((account) => { const mentor = account.role === "mentor" || account.role === "tutor"; const active = account.status !== "disabled"; return <tr key={account.id}><td><strong>{account.name}</strong>{account.is_primary_admin ? <small>Principal</small> : null}</td><td>{account.role}</td><td>{account.email}</td><td><button className="table-action" disabled={Boolean(busy) || account.id === user.id} onClick={() => action({ action: "user_status", user_id: account.id, status: active ? "disabled" : "active" }, active ? "Conta desativada." : "Conta ativada.")}>{active ? "Ativa" : "Desativada"}</button></td><td>{mentor ? <button className="table-action" disabled={Boolean(busy)} onClick={() => action({ action: "mentor_permission", user_id: account.id, allowed: !account.can_invite_mentors }, "Permissão de convites atualizada.")}>{account.can_invite_mentors ? "Pode convidar Mentores" : "Sem convite de Mentores"}</button> : "—"}</td></tr>; })}</tbody></table></div></section>

    <section className="workspace-section"><p className="eyebrow">Credenciais</p><h2>Convites de Mentor</h2><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Código</th><th>Situação</th></tr></thead><tbody>{data.mentor_invitations.map((inv) => <tr key={inv.code}><td>{inv.name}</td><td>{inv.email}</td><td><code>{inv.code}</code></td><td>{inv.redeemed_at ? "Utilizado" : inv.revoked_at ? "Revogado" : "Ativo"}</td></tr>)}</tbody></table></div></section>
  </>;
}
