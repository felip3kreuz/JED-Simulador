"use client";

import { useEffect, useMemo, useState } from "react";
import { createJEDClient } from "@/lib/jed-core";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export default function MentorWorkspace({ user }) {
  const [data, setData] = useState({ classes: [], companies: [], invitations: [] });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
      } catch {
        setScores({});
      } finally {
        try { client?.close(); } catch { /* nada */ }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar painel.");
    } finally { setLoading(false); }
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
      setClassName(""); setNotice(`Turma ${payload.class?.name || "criada"} criada. Código: ${payload.class?.join_code || "—"}`);
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
      setNotice(`Convite criado para ${payload.invitation?.email || invite.email}. Código: ${payload.invitation?.code || "—"}`);
      setInvite((current) => ({ ...current, name: "", email: "", institutional_id: "" }));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao criar convite."); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="workspace-loading">Carregando turmas e empresas…</section>;

  return (
    <>
      <section className="workspace-hero">
        <div><p className="eyebrow">Mentoria</p><h1>Painel do Mentor</h1><p className="lede">Acompanhe turmas, convide alunos e consulte resultados sincronizados.</p></div>
        <div className="workspace-summary"><strong>{data.classes.length}</strong><span>turmas</span><strong>{data.companies.length}</strong><span>empresas</span></div>
      </section>

      {error ? <div className="workspace-alert workspace-alert-error">{error}</div> : null}
      {notice ? <div className="workspace-alert workspace-alert-success">{notice}</div> : null}

      <section className="workspace-two-col">
        <article className="workspace-card">
          <p className="eyebrow">Nova turma</p><h2>Criar turma</h2>
          <form className="compact-form" onSubmit={createClass}>
            <label>Nome<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Empreendedorismo 2026" /></label>
            <button className="primary-button" disabled={busy}>Criar turma</button>
          </form>
        </article>
        <article className="workspace-card">
          <p className="eyebrow">Novo aluno</p><h2>Gerar convite</h2>
          <form className="compact-form" onSubmit={createInvitation}>
            <label>Turma<select value={invite.class_id} onChange={(e) => setInvite({ ...invite, class_id: e.target.value })} required><option value="">Selecione</option>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Nome<input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} required /></label>
            <label>E-mail<input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></label>
            <label>Matrícula/ID<input value={invite.institutional_id} onChange={(e) => setInvite({ ...invite, institutional_id: e.target.value })} /></label>
            <button className="primary-button" disabled={busy || !invite.class_id}>Criar convite</button>
          </form>
        </article>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-head"><div><p className="eyebrow">Turmas</p><h2>Acompanhamento</h2></div><button className="secondary-button" onClick={load}>Atualizar</button></div>
        <div className="class-grid">
          {data.classes.length ? data.classes.map((cl) => {
            const list = companiesByClass[cl.id] || [];
            return <article className="workspace-card" key={cl.id}>
              <div className="class-title"><div><h3>{cl.name}</h3><span>Código {cl.join_code}</span></div><strong>{cl.student_ids?.length || 0} alunos</strong></div>
              <div className="company-result-list">
                {list.length ? list.map((remote) => {
                  const company = remote.company || {};
                  const last = company.historico?.[company.historico.length - 1];
                  return <div className="company-result" key={remote.id}><div><strong>{company.nome || company.responsavel || "Empresa"}</strong><span>{company.responsavel || remote.owner_id} · semana {company.semana || 0}</span></div><div><strong>{last ? money.format(Number(last.resultado || 0)) : "—"}</strong><span>Score {number.format(Number(scores[remote.id] || 0))}</span></div></div>;
                }) : <p className="student-muted">Nenhuma empresa sincronizada nesta turma.</p>}
              </div>
            </article>;
          }) : <div className="workspace-card"><p className="student-muted">Nenhuma turma criada.</p></div>}
        </div>
      </section>

      <section className="workspace-section">
        <p className="eyebrow">Convites</p><h2>Credenciais emitidas</h2>
        <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Aluno</th><th>E-mail</th><th>Código</th><th>Situação</th></tr></thead><tbody>{data.invitations.map((inv) => <tr key={inv.code}><td>{inv.name}</td><td>{inv.email}</td><td><code>{inv.code}</code></td><td>{inv.redeemed_at ? "Utilizado" : inv.revoked_at ? "Revogado" : "Ativo"}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
