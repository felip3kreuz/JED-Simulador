"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";

const TEMP_PASSWORD = "acbd1234";

function roleName(role) {
  if (role === "admin") return "ADMINISTRADOR";
  if (role === "mentor" || role === "tutor") return "MENTOR";
  if (role === "aluno") return "ALUNO";
  return String(role || "USUÁRIO").toUpperCase();
}

function emailState(account) {
  if (account.email_status === "sent") return ["ENVIADO", "active"];
  if (account.email_status === "failed") return ["FALHOU", "revoked"];
  if (account.email_status === "not_configured") return ["SMTP NÃO CONFIG.", "used"];
  return ["—", "used"];
}

function parseCSVLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      values.push(current.trim()); current = "";
    } else current += ch;
  }
  values.push(current.trim());
  return values;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
}

function parseUsersCSV(text) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("O CSV deve conter cabeçalho e pelo menos um usuário.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseCSVLine(lines[0], delimiter).map(normalizeHeader);
  const index = (names) => headers.findIndex((h) => names.includes(h));
  const nameIndex = index(["nome", "name"]);
  const emailIndex = index(["email", "e_mail"]);
  const roleIndex = index(["papel", "perfil", "role"]);
  const institutionIndex = index(["instituicao", "institution"]);
  const idIndex = index(["id_institucional", "identificador_institucional", "institutional_id"]);
  if (nameIndex < 0 || emailIndex < 0 || roleIndex < 0) throw new Error("Cabeçalho obrigatório: nome,email,papel. Instituição e ID institucional são opcionais.");

  return lines.slice(1).map((line, row) => {
    const cells = parseCSVLine(line, delimiter);
    const rawRole = String(cells[roleIndex] || "").trim().toLowerCase();
    const role = rawRole === "administrador" ? "admin" : rawRole === "tutor" ? "mentor" : rawRole;
    if (!["aluno", "mentor", "admin"].includes(role)) throw new Error(`Linha ${row + 2}: papel deve ser aluno, mentor ou admin.`);
    const name = String(cells[nameIndex] || "").trim();
    const email = String(cells[emailIndex] || "").trim().toLowerCase();
    if (!name || !email.includes("@")) throw new Error(`Linha ${row + 2}: nome ou e-mail inválido.`);
    return {
      name,
      email,
      role,
      institution: institutionIndex >= 0 ? String(cells[institutionIndex] || "").trim() : "",
      institutional_id: idIndex >= 0 ? String(cells[idIndex] || "").trim() : "",
    };
  });
}

export default function AdminWorkspace({ user }) {
  const [data, setData] = useState({ users: [], email: { configured: false } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState("");
  const [form, setForm] = useState({ role: "aluno", name: "", email: "", institution: "", institutional_id: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar administração.");
      setData({ users: Array.isArray(payload.users) ? payload.users : [], email: payload.email || { configured: false } });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao carregar administração."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    admins: data.users.filter((u) => u.role === "admin").length,
    mentors: data.users.filter((u) => u.role === "mentor" || u.role === "tutor").length,
    students: data.users.filter((u) => u.role === "aluno").length,
    pendingPassword: data.users.filter((u) => u.must_change_password).length,
  }), [data.users]);

  async function action(input, label = "Operação concluída.") {
    setBusy(input.action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha na operação.");
      setNotice(label);
      await load();
      return payload.result || true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha na operação."); return false; }
    finally { setBusy(""); }
  }

  async function createUser(event) {
    event.preventDefault();
    const result = await action({ action: "create_user", ...form }, `${roleName(form.role)} cadastrado. Senha temporária: ${TEMP_PASSWORD}.`);
    if (result) {
      const emailMessage = result.email_status === "sent" ? " E-mail enviado." : result.email_status === "not_configured" ? " SMTP não configurado: o e-mail ainda não foi enviado." : result.email_status === "failed" ? " O envio do e-mail falhou; confira a configuração SMTP." : "";
      setNotice(`${roleName(form.role)} cadastrado. Senha temporária: ${TEMP_PASSWORD}.${emailMessage}`);
      setForm({ role: "aluno", name: "", email: "", institution: "", institutional_id: "" });
      setDialog("");
    }
  }

  async function importCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy("import_users"); setError(""); setNotice("");
    try {
      const users = parseUsersCSV(await file.text());
      const created = [];
      const failures = [];
      for (let index = 0; index < users.length; index += 1) {
        const row = users[index];
        try {
          const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_user", ...row }) });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error || "Falha ao cadastrar usuário.");
          created.push(payload.result);
        } catch (caught) {
          failures.push({ row: index + 2, email: row.email, error: caught instanceof Error ? caught.message : "Falha no cadastro" });
        }
      }
      const sent = created.filter((u) => u?.email_status === "sent").length;
      setNotice(`${created.length} usuário(s) cadastrado(s); ${sent} e-mail(s) enviado(s); ${failures.length} linha(s) rejeitada(s). Senha temporária: ${TEMP_PASSWORD}.`);
      if (failures.length) setError(failures.slice(0, 5).map((item) => `Linha ${item.row}: ${item.email || "—"} — ${item.error}`).join(" | "));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao importar CSV."); }
    finally { setBusy(""); event.target.value = ""; }
  }

  function downloadTemplate() {
    const csv = "nome,email,papel,instituicao,id_institucional\nAna Lima,ana@example.com,aluno,Escola JED,A-001\nCarlos Souza,carlos@example.com,mentor,Escola JED,M-001\nMaria Silva,maria@example.com,admin,Escola JED,ADM-002\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo_usuarios_jed.csv"; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <section className="workspace-loading">CARREGANDO USUÁRIOS E CONFIGURAÇÃO…</section>;

  return <>
    <section id="visao-geral" className="orbit-overview-strip">
      <div><span>SESSÃO</span><strong>{user.is_primary_admin ? "ADMINISTRADOR PRINCIPAL" : "ADMINISTRADOR"}</strong><small>Cadastros centralizados · senha temporária obrigatória</small></div>
      <div className="orbit-stat-row">
        <div><span>ADMINS</span><strong>{stats.admins}</strong></div><div><span>MENTORES</span><strong>{stats.mentors}</strong></div><div><span>ALUNOS</span><strong>{stats.students}</strong></div><div><span>1º ACESSO</span><strong>{stats.pendingPassword}</strong></div>
      </div>
    </section>

    {error ? <div className="workspace-alert workspace-alert-error">ATENÇÃO · {error}</div> : null}
    {notice ? <div className="workspace-alert workspace-alert-success">OK · {notice}</div> : null}
    {!data.email?.configured ? <div className="workspace-alert workspace-alert-error">E-MAIL NÃO CONFIGURADO · As contas serão criadas, mas as mensagens de cadastro não poderão ser entregues até configurar o SMTP do JED Servidor.</div> : <div className="workspace-alert workspace-alert-success">E-MAIL ATIVO · Remetente: {data.email.from_email || "configurado"}</div>}

    <section className="orbit-toolbar" aria-label="Ações administrativas">
      <button className="primary-button" type="button" onClick={() => setDialog("user")}>CADASTRAR USUÁRIO</button>
      <label className="secondary-button file-button">IMPORTAR CSV<input type="file" accept=".csv,text/csv" onChange={importCSV} disabled={Boolean(busy)} /></label>
      <button className="secondary-button" type="button" onClick={downloadTemplate}>BAIXAR MODELO CSV</button>
      <button className="secondary-button" type="button" onClick={load}>ATUALIZAR</button>
    </section>

    <section id="usuarios" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">CONTAS</p><h2>USUÁRIOS DO SERVIDOR</h2></div><span className="section-count">{data.users.length} REGISTROS</span></div>
      <p className="section-help">Somente Administradores cadastram contas. Todos os novos usuários recebem a senha temporária <strong>{TEMP_PASSWORD}</strong> e devem substituí-la no primeiro acesso.</p>
      <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Nome</th><th>Papel</th><th>E-mail</th><th>Primeiro acesso</th><th>E-mail</th><th>Status</th></tr></thead><tbody>{data.users.map((account) => {
        const active = account.status !== "disabled";
        const [mailLabel, mailClass] = emailState(account);
        return <tr key={account.id}>
          <td><strong>{account.name}</strong>{account.is_primary_admin ? <small>ADMIN PRINCIPAL</small> : null}{account.institutional_id ? <small>{account.institutional_id}</small> : null}</td>
          <td><span className={`role-chip role-${account.role}`}>{roleName(account.role)}</span></td>
          <td>{account.email}</td>
          <td>{account.must_change_password ? <span className="state-label active">TROCA PENDENTE</span> : <span className="state-label used">CONCLUÍDO</span>}</td>
          <td><span className={`state-label ${mailClass}`} title={account.email_error || ""}>{mailLabel}</span>{account.must_change_password && account.email_status !== "sent" ? <button className="table-action" disabled={Boolean(busy)} onClick={() => action({ action: "resend_email", user_id: account.id }, "E-mail de cadastro reenviado.")}>REENVIAR</button> : null}</td>
          <td><button className={`table-action ${active ? "state-active" : ""}`} disabled={Boolean(busy) || account.id === user.id} onClick={() => action({ action: "user_status", user_id: account.id, status: active ? "disabled" : "active" }, active ? "Conta desativada." : "Conta ativada.")}>{active ? "ATIVA" : "DESATIVADA"}</button></td>
        </tr>;
      })}</tbody></table></div>
    </section>

    <section id="importacao" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">IMPORTAÇÃO</p><h2>LISTA CSV</h2></div></div>
      <div className="workspace-card"><p className="section-help">Cabeçalhos: <code>nome,email,papel,instituicao,id_institucional</code>. O campo <code>papel</code> aceita <code>aluno</code>, <code>mentor</code> ou <code>admin</code>. Vírgula e ponto e vírgula são aceitos como separadores.</p></div>
    </section>

    <Modal open={dialog === "user"} title="CADASTRAR USUÁRIO" subtitle={`A senha inicial será ${TEMP_PASSWORD} e deverá ser alterada no primeiro acesso.`} onClose={() => setDialog("")}>
      <form className="orbit-form" onSubmit={createUser}>
        <label>PERFIL<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="aluno">Aluno</option><option value="mentor">Mentor</option><option value="admin">Administrador</option></select></label>
        <label>NOME<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>E-MAIL<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <div className="orbit-form-two"><label>INSTITUIÇÃO<input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></label><label>ID INSTITUCIONAL<input value={form.institutional_id} onChange={(e) => setForm({ ...form, institutional_id: e.target.value })} /></label></div>
        <div className="activation-note"><strong>SENHA TEMPORÁRIA</strong><span>{TEMP_PASSWORD} · troca obrigatória no primeiro acesso.</span></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={Boolean(busy)}>CADASTRAR E AVISAR POR E-MAIL</button></div>
      </form>
    </Modal>
  </>;
}
