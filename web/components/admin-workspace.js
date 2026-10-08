"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";

function roleName(role) {
  if (role === "admin") return "ADMINISTRADOR";
  if (role === "mentor" || role === "tutor") return "MENTOR";
  if (role === "aluno") return "ALUNO";
  return String(role || "USUÁRIO").toUpperCase();
}

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* navegador pode negar clipboard */ }
  }
  return <button type="button" className="code-button" onClick={copy}><code>{code}</code><span>{copied ? "COPIADO" : "COPIAR"}</span></button>;
}

export default function AdminWorkspace({ user }) {
  const [data, setData] = useState({ users: [], mentor_invitations: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState("");
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [mentorForm, setMentorForm] = useState({ name: "", email: "", institution: "", institutional_id: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar administração.");
      setData({
        users: Array.isArray(payload.users) ? payload.users : [],
        mentor_invitations: Array.isArray(payload.mentor_invitations) ? payload.mentor_invitations : [],
      });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao carregar administração."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    admins: data.users.filter((u) => u.role === "admin").length,
    mentors: data.users.filter((u) => u.role === "mentor" || u.role === "tutor").length,
    students: data.users.filter((u) => u.role === "aluno").length,
    activeCredentials: data.mentor_invitations.filter((i) => !i.redeemed_at && !i.revoked_at).length,
  }), [data]);

  async function action(input, label = "Operação concluída.") {
    setBusy(input.action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha na operação.");
      const code = payload.result?.code ? ` Código: ${payload.result.code}` : "";
      setNotice(label + code);
      await load();
      return payload.result || true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha na operação."); return false; }
    finally { setBusy(""); }
  }

  async function createAdmin(event) {
    event.preventDefault();
    if (adminForm.password !== adminForm.confirm) { setError("As senhas do novo Administrador não coincidem."); return; }
    const ok = await action({ action: "create_admin", name: adminForm.name, email: adminForm.email, password: adminForm.password }, "Administrador criado.");
    if (ok) { setAdminForm({ name: "", email: "", password: "", confirm: "" }); setDialog(""); }
  }
  async function inviteMentor(event) {
    event.preventDefault();
    const result = await action({ action: "mentor_invitation", ...mentorForm }, "Credencial de Mentor criada. O Mentor deve definir a própria senha em CADASTRAR MENTOR.");
    if (result) { setMentorForm({ name: "", email: "", institution: "", institutional_id: "" }); setDialog(""); }
  }

  if (loading) return <section className="workspace-loading">CARREGANDO USUÁRIOS E PERMISSÕES…</section>;

  return <>
    <section id="visao-geral" className="orbit-overview-strip">
      <div><span>SESSÃO</span><strong>{user.is_primary_admin ? "ADMINISTRADOR PRINCIPAL" : "ADMINISTRADOR"}</strong><small>Servidor autenticado · operações administrativas disponíveis</small></div>
      <div className="orbit-stat-row">
        <div><span>ADMINS</span><strong>{stats.admins}</strong></div>
        <div><span>MENTORES</span><strong>{stats.mentors}</strong></div>
        <div><span>ALUNOS</span><strong>{stats.students}</strong></div>
        <div><span>MTR ATIVAS</span><strong>{stats.activeCredentials}</strong></div>
      </div>
    </section>

    {error ? <div className="workspace-alert workspace-alert-error">ERRO · {error}</div> : null}
    {notice ? <div className="workspace-alert workspace-alert-success">OK · {notice}</div> : null}

    <section className="orbit-toolbar" aria-label="Ações administrativas">
      <button className="primary-button" type="button" onClick={() => setDialog("mentor")}>CREDENCIAR MENTOR</button>
      <button className="secondary-button" type="button" onClick={() => setDialog("admin")}>CRIAR ADMIN</button>
      <button className="secondary-button" type="button" onClick={load}>ATUALIZAR</button>
    </section>

    <section id="usuarios" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">CONTAS</p><h2>USUÁRIOS DO SERVIDOR</h2></div><span className="section-count">{data.users.length} REGISTROS</span></div>
      <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Nome</th><th>Papel</th><th>E-mail</th><th>Status</th><th>Permissões</th></tr></thead><tbody>{data.users.map((account) => {
        const mentor = account.role === "mentor" || account.role === "tutor";
        const active = account.status !== "disabled";
        return <tr key={account.id}><td><strong>{account.name}</strong>{account.is_primary_admin ? <small>ADMIN PRINCIPAL</small> : null}</td><td><span className={`role-chip role-${account.role}`}>{roleName(account.role)}</span></td><td>{account.email}</td><td><button className={`table-action ${active ? "state-active" : ""}`} disabled={Boolean(busy) || account.id === user.id} onClick={() => action({ action: "user_status", user_id: account.id, status: active ? "disabled" : "active" }, active ? "Conta desativada." : "Conta ativada.")}>{active ? "ATIVA" : "DESATIVADA"}</button></td><td>{mentor ? <button className="table-action" disabled={Boolean(busy)} onClick={() => action({ action: "mentor_permission", user_id: account.id, allowed: !account.can_invite_mentors }, "Permissão de credenciamento atualizada.")}>{account.can_invite_mentors ? "CREDENCIA MENTORES" : "SEM CREDENCIAMENTO"}</button> : "—"}</td></tr>;
      })}</tbody></table></div>
    </section>

    <section id="credenciais" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">CREDENCIAIS</p><h2>MENTORES / CÓDIGOS MTR</h2></div><button className="secondary-button" type="button" onClick={() => setDialog("mentor")}>NOVA CREDENCIAL</button></div>
      <p className="section-help">O Administrador não cria a senha do Mentor. Emita a credencial; o Mentor usa o código em <strong>CADASTRAR MENTOR</strong> e define a própria senha.</p>
      <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Código</th><th>Situação</th></tr></thead><tbody>{data.mentor_invitations.length ? data.mentor_invitations.map((inv) => <tr key={inv.code}><td>{inv.name}</td><td>{inv.email}</td><td><CopyCode code={inv.code} /></td><td>{inv.redeemed_at ? <span className="state-label used">UTILIZADO</span> : inv.revoked_at ? <span className="state-label revoked">REVOGADO</span> : <span className="state-label active">ATIVO</span>}</td></tr>) : <tr><td colSpan="4" className="empty-cell">Nenhuma credencial emitida.</td></tr>}</tbody></table></div>
    </section>

    <Modal open={dialog === "admin"} title="CRIAR ADMIN" subtitle="Cria outro Administrador com senha inicial definida pelo Administrador atual." onClose={() => setDialog("")}>
      <form className="orbit-form" onSubmit={createAdmin}>
        <label>NOME<input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} required /></label>
        <label>E-MAIL<input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required /></label>
        <div className="orbit-form-two"><label>SENHA INICIAL<input type="password" minLength={8} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required /></label><label>REPETIR SENHA<input type="password" minLength={8} value={adminForm.confirm} onChange={(e) => setAdminForm({ ...adminForm, confirm: e.target.value })} required /></label></div>
        {adminForm.confirm && adminForm.password !== adminForm.confirm ? <div className="form-error">As senhas não coincidem.</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={Boolean(busy) || Boolean(adminForm.confirm && adminForm.password !== adminForm.confirm)}>CONFIRMAR</button></div>
      </form>
    </Modal>

    <Modal open={dialog === "mentor"} title="CREDENCIAR MENTOR" subtitle="Gera um código MTR. A senha será criada pelo próprio Mentor na ativação." onClose={() => setDialog("")}>
      <form className="orbit-form" onSubmit={inviteMentor}>
        <label>NOME<input value={mentorForm.name} onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })} required /></label>
        <label>E-MAIL<input type="email" value={mentorForm.email} onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })} required /></label>
        <div className="orbit-form-two"><label>INSTITUIÇÃO<input value={mentorForm.institution} onChange={(e) => setMentorForm({ ...mentorForm, institution: e.target.value })} /></label><label>ID INSTITUCIONAL<input value={mentorForm.institutional_id} onChange={(e) => setMentorForm({ ...mentorForm, institutional_id: e.target.value })} /></label></div>
        <div className="activation-note"><strong>SENHA</strong><span>Não é definida aqui. O Mentor recebe a credencial e cria a própria senha no cadastro web.</span></div>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={Boolean(busy)}>GERAR CREDENCIAL</button></div>
      </form>
    </Modal>
  </>;
}
