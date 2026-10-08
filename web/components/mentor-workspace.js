"use client";

import { useEffect, useMemo, useState } from "react";
import { createJEDClient } from "@/lib/jed-core";
import Modal from "@/components/modal";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  }
  return <button type="button" className="code-button" onClick={copy}><code>{code}</code><span>{copied ? "COPIADO" : "COPIAR"}</span></button>;
}

export default function MentorWorkspace({ user }) {
  const [data, setData] = useState({ classes: [], companies: [], invitations: [] });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState("");
  const [className, setClassName] = useState("");
  const [invite, setInvite] = useState({ class_id: "", name: "", email: "", institutional_id: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/mentor/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar painel.");
      const next = {
        classes: Array.isArray(payload.classes) ? payload.classes : [],
        companies: Array.isArray(payload.companies) ? payload.companies : [],
        invitations: Array.isArray(payload.invitations) ? payload.invitations : [],
      };
      setData(next);
      setInvite((current) => ({ ...current, class_id: current.class_id || next.classes[0]?.id || "" }));
      let client;
      try {
        client = await createJEDClient(1);
        const mapped = {};
        for (const remote of next.companies) mapped[remote.id] = client.score(remote.company || {}).Total || 0;
        setScores(mapped);
      } catch { setScores({}); }
      finally { try { client?.close(); } catch {} }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao carregar painel."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const companiesByClass = useMemo(() => {
    const map = {};
    for (const remote of data.companies) (map[remote.class_id || ""] ||= []).push(remote);
    return map;
  }, [data.companies]);

  async function createClass(event) {
    event.preventDefault();
    if (!className.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mentor/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: className.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar turma.");
      setClassName(""); setDialog("");
      setNotice(`Turma ${payload.class?.name || "criada"} criada. Código para entrada: ${payload.class?.join_code || "—"}`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao criar turma."); }
    finally { setBusy(false); }
  }

  async function createInvitation(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mentor/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invite) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar convite.");
      setNotice(`Convite individual criado para ${payload.invitation?.email || invite.email}. Código: ${payload.invitation?.code || "—"}. O Aluno define a própria senha ao ativá-lo.`);
      setInvite((current) => ({ ...current, name: "", email: "", institutional_id: "" }));
      setDialog(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao criar convite."); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="workspace-loading">CARREGANDO TURMAS E EMPRESAS…</section>;

  return <>
    <section id="visao-geral" className="orbit-overview-strip">
      <div><span>SESSÃO</span><strong>MENTOR / {user.name}</strong><small>{user.institution || "Instituição não informada"} · acompanhamento online</small></div>
      <div className="orbit-stat-row"><div><span>TURMAS</span><strong>{data.classes.length}</strong></div><div><span>EMPRESAS</span><strong>{data.companies.length}</strong></div><div><span>CONVITES</span><strong>{data.invitations.length}</strong></div></div>
    </section>

    {error ? <div className="workspace-alert workspace-alert-error">ERRO · {error}</div> : null}
    {notice ? <div className="workspace-alert workspace-alert-success">OK · {notice}</div> : null}

    <section className="orbit-toolbar">
      <button className="primary-button" type="button" onClick={() => setDialog("class")}>CRIAR TURMA</button>
      <button className="secondary-button" type="button" onClick={() => setDialog("invite")} disabled={!data.classes.length}>CONVIDAR ALUNO</button>
      <button className="secondary-button" type="button" onClick={load}>ATUALIZAR</button>
    </section>

    <section id="turmas" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">TURMAS</p><h2>ACOMPANHAMENTO</h2></div><span className="section-count">{data.classes.length} TURMAS</span></div>
      <p className="section-help">Para o fluxo mais simples, o Aluno cria a própria conta em <strong>CADASTRAR ALUNO</strong> e entra usando o código da turma. Convites individuais continuam disponíveis como alternativa.</p>
      <div className="class-grid">
        {data.classes.length ? data.classes.map((cl) => {
          const list = companiesByClass[cl.id] || [];
          return <article className="workspace-card orbit-class-card" key={cl.id}>
            <div className="class-title"><div><span className="technical-label">TURMA</span><h3>{cl.name}</h3><CopyCode code={cl.join_code} /></div><strong>{cl.student_ids?.length || 0} ALUNOS</strong></div>
            <div className="company-result-list">
              {list.length ? list.map((remote) => {
                const company = remote.company || {}; const last = company.historico?.[company.historico.length - 1];
                return <div className="company-result" key={remote.id}><div><strong>{company.nome || company.responsavel || "Empresa"}</strong><span>{company.responsavel || remote.owner_id} · SEMANA {company.semana || 0}</span></div><div><strong>{last ? money.format(Number(last.resultado || 0)) : "—"}</strong><span>SCORE {number.format(Number(scores[remote.id] || 0))}</span></div></div>;
              }) : <p className="student-muted">Nenhuma empresa sincronizada nesta turma.</p>}
            </div>
          </article>;
        }) : <div className="workspace-card"><p className="student-muted">Nenhuma turma criada. Use CRIAR TURMA para começar.</p></div>}
      </div>
    </section>

    <section id="convites" className="workspace-section orbit-section">
      <div className="workspace-section-head"><div><p className="eyebrow">ALUNOS</p><h2>CONVITES INDIVIDUAIS</h2></div><button className="secondary-button" type="button" onClick={() => setDialog("invite")} disabled={!data.classes.length}>NOVO CONVITE</button></div>
      <p className="section-help">A senha não é escolhida pelo Mentor. O Aluno usa o código em <strong>ATIVAR CONVITE DE ALUNO</strong> e cria a própria senha.</p>
      <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Aluno</th><th>E-mail</th><th>Código</th><th>Situação</th></tr></thead><tbody>{data.invitations.length ? data.invitations.map((inv) => <tr key={inv.code}><td>{inv.name}</td><td>{inv.email}</td><td><CopyCode code={inv.code} /></td><td>{inv.redeemed_at ? <span className="state-label used">UTILIZADO</span> : inv.revoked_at ? <span className="state-label revoked">REVOGADO</span> : <span className="state-label active">ATIVO</span>}</td></tr>) : <tr><td colSpan="4" className="empty-cell">Nenhum convite individual emitido.</td></tr>}</tbody></table></div>
    </section>

    <Modal open={dialog === "class"} title="CRIAR TURMA ONLINE" subtitle="Cria uma turma e gera o código que os Alunos usam para entrar." onClose={() => setDialog("")}>
      <form className="orbit-form" onSubmit={createClass}><label>NOME DA TURMA<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Empreendedorismo 2026" required /></label><div className="activation-note"><strong>CÓDIGO</strong><span>Será gerado automaticamente ao criar a turma.</span></div>{error ? <div className="form-error">{error}</div> : null}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={busy}>CRIAR TURMA</button></div></form>
    </Modal>

    <Modal open={dialog === "invite"} title="CONVIDAR ALUNO" subtitle="Convite individual opcional. O Aluno criará a própria senha durante a ativação." onClose={() => setDialog("")}>
      <form className="orbit-form" onSubmit={createInvitation}>
        <label>TURMA<select value={invite.class_id} onChange={(e) => setInvite({ ...invite, class_id: e.target.value })} required><option value="">SELECIONE</option>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>NOME<input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} required /></label>
        <label>E-MAIL<input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></label>
        <label>MATRÍCULA / ID<input value={invite.institutional_id} onChange={(e) => setInvite({ ...invite, institutional_id: e.target.value })} /></label>
        <div className="activation-note"><strong>SENHA</strong><span>Não é solicitada aqui. O Aluno define a própria senha ao ativar o convite.</span></div>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={busy || !invite.class_id}>CRIAR CONVITE</button></div>
      </form>
    </Modal>
  </>;
}
