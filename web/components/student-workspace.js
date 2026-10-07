"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createJEDClient } from "@/lib/jed-core";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function clone(value) { return JSON.parse(JSON.stringify(value ?? {})); }
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
function localKey(remoteID) { return `jed:web:draft:${remoteID}`; }

function CompanyPicker({ companies, selectedID, onChange }) {
  if (companies.length <= 1) return null;
  return <label className="company-picker"><span>Empresa</span><select value={selectedID} onChange={(e) => onChange(e.target.value)}>{companies.map((remote) => <option key={remote.id} value={remote.id}>{remote.company?.nome || remote.company?.local_id || "Empresa sem nome"}</option>)}</select></label>;
}
function Metric({ label, value, detail }) { return <article className="student-metric"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>; }
function CheckList({ title, items, selected, onToggle, disabled }) {
  return <fieldset className="choice-field"><legend>{title}</legend><div className="choice-grid">{items.map((item) => { const id = item.ID || item.id; const name = item.Nome || item.nome || id; return <label className={selected.includes(id) ? "choice-card selected" : "choice-card"} key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => onToggle(id)} disabled={disabled} /><span><strong>{name}</strong><small>{item.Descricao || item.descricao || ""}</small></span></label>; })}</div></fieldset>;
}

export default function StudentWorkspace({ user }) {
  const [companies, setCompanies] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedID, setSelectedID] = useState("");
  const [draft, setDraft] = useState(null);
  const [baseRevision, setBaseRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [core, setCore] = useState({ client: null, channels: [], tools: [], indicators: null, score: null, state: "loading" });
  const coreRef = useRef(null);

  async function loadRemote({ force = false } = {}) {
    if (dirty && !force && !window.confirm("Há alterações locais não sincronizadas. Descartá-las e recarregar do servidor?")) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const [companyResponse, classResponse] = await Promise.all([
        fetch("/api/student/companies", { cache: "no-store" }),
        fetch("/api/student/classes", { cache: "no-store" }),
      ]);
      const companyPayload = await companyResponse.json();
      const classPayload = await classResponse.json();
      if (!companyResponse.ok) throw new Error(companyPayload?.error || "Falha ao carregar empresas.");
      const list = Array.isArray(companyPayload.companies) ? companyPayload.companies : [];
      setCompanies(list);
      setClasses(classResponse.ok && Array.isArray(classPayload.classes) ? classPayload.classes : []);
      setSelectedID((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id || "");
      setDirty(false); setProcessed(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao carregar dados."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadRemote({ force: true }); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = await createJEDClient(Date.now());
        if (cancelled) { try { client.close(); } catch {} return; }
        coreRef.current = client;
        setCore((state) => ({ ...state, client, channels: client.digitalChannels() || [], tools: client.digitalTools() || [], state: "ready" }));
      } catch (caught) {
        if (!cancelled) setCore((state) => ({ ...state, state: "error", error: caught instanceof Error ? caught.message : String(caught) }));
      }
    })();
    return () => { cancelled = true; try { coreRef.current?.close(); } catch {} coreRef.current = null; };
  }, []);

  const selected = useMemo(() => companies.find((item) => item.id === selectedID) || companies[0] || null, [companies, selectedID]);

  useEffect(() => {
    if (!selected?.company) { setDraft(null); return; }
    const revision = Number(selected.revision ?? selected.company.revision ?? 0);
    let next = clone(selected.company); let restored = false; let wasProcessed = false;
    try {
      const saved = JSON.parse(localStorage.getItem(localKey(selected.id)) || "null");
      if (saved && Number(saved.baseRevision) === revision && saved.company) { next = saved.company; restored = true; wasProcessed = Boolean(saved.processed); }
    } catch { /* rascunho corrompido é ignorado */ }
    setDraft(next); setBaseRevision(revision); setDirty(restored); setProcessed(wasProcessed);
    if (restored) setNotice("Rascunho local restaurado. Sincronize quando estiver pronto.");
  }, [selected?.id, selected?.revision]);

  useEffect(() => {
    if (!draft || !selected?.id) return;
    const client = coreRef.current;
    if (!client) return;
    try { setCore((state) => ({ ...state, indicators: client.indicators(draft), score: client.score(draft) })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao calcular indicadores."); }
  }, [draft, selected?.id, core.state]);

  useEffect(() => {
    if (!draft || !selected?.id || !dirty) return;
    try { localStorage.setItem(localKey(selected.id), JSON.stringify({ baseRevision, company: draft, processed, savedAt: new Date().toISOString() })); }
    catch { /* armazenamento local indisponível não impede a simulação */ }
  }, [draft, dirty, processed, selected?.id, baseRevision]);

  function edit(field, value) { if (processed) return; setDraft((current) => ({ ...current, [field]: value })); setDirty(true); setNotice("Decisões salvas localmente neste navegador."); }
  function toggleList(field, id) { const current = Array.isArray(draft?.[field]) ? draft[field] : []; edit(field, current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  function processWeek() {
    setError(""); setNotice("");
    if (!draft || !coreRef.current) { setError("JED Core ainda não está disponível."); return; }
    const duration = Number(draft.duracao_semanas || 0);
    if (duration > 0 && Number(draft.semana || 0) >= duration) { setError("A simulação já atingiu a última semana configurada."); return; }
    try {
      const result = coreRef.current.processWeek(clone(draft));
      setDraft(result.empresa); setDirty(true); setProcessed(true);
      setNotice(`Semana ${result.registro?.semana || result.empresa?.semana || ""} processada no JED Core. Sincronize para gravar no servidor.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao processar semana."); }
  }

  async function syncCompany() {
    if (!draft || !selected) return;
    setSyncing(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/student/companies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ local_id: draft.local_id, class_id: selected.class_id || draft.turma_id || "", company: draft }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao sincronizar empresa.");
      const remote = payload.company;
      setCompanies((list) => list.map((item) => item.id === selected.id ? remote : item));
      setBaseRevision(Number(remote.revision || 0)); setDraft(clone(remote.company)); setDirty(false); setProcessed(false);
      try { localStorage.removeItem(localKey(selected.id)); } catch {}
      setNotice("Empresa sincronizada com o JED Servidor.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao sincronizar empresa."); }
    finally { setSyncing(false); }
  }

  async function joinClass(event) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const response = await fetch("/api/student/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: joinCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao entrar na turma.");
      setJoinCode(""); setNotice(`Você entrou na turma ${payload.class?.name || "informada"}.`);
      const classesResponse = await fetch("/api/student/classes", { cache: "no-store" });
      const classesPayload = await classesResponse.json();
      if (classesResponse.ok) setClasses(Array.isArray(classesPayload.classes) ? classesPayload.classes : []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao entrar na turma."); }
  }

  if (loading) return <section className="student-loading">Carregando dados do JED Servidor…</section>;

  if (!companies.length) return <><section className="student-empty"><p className="eyebrow">Sem empresa sincronizada</p><h2>Esta conta ainda não possui uma empresa no servidor.</h2><p>Use a versão Windows para criar/sincronizar a empresa inicial ou entre em uma turma abaixo.</p><form className="inline-form" onSubmit={joinClass}><input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Código da turma" /><button className="primary-button">Entrar na turma</button></form></section>{error ? <div className="workspace-alert workspace-alert-error">{error}</div> : null}</>;

  const remote = selected; const company = draft || remote.company || {}; const indicators = core.indicators; const score = core.score;
  const last = company.historico?.length ? company.historico[company.historico.length - 1] : null;
  const duration = Number(company.duracao_semanas || 0); const week = Number(company.semana || 0); const progress = duration ? Math.min(100, week / duration * 100) : 0;
  const disabled = processed || syncing;

  return <>
    <section className="student-company-head"><div><p className="eyebrow">Empresa do Aluno</p><h1>{company.nome || "Empresa sem nome"}</h1><p className="lede">{company.modelo_base || company.especialidade || "Modelo não informado"}{company.setor ? ` · ${company.setor}` : ""}</p></div><div className="student-company-actions"><CompanyPicker companies={companies} selectedID={remote.id} onChange={(id) => { if (!dirty || window.confirm("Trocar de empresa e descartar alterações locais não sincronizadas?")) setSelectedID(id); }} /><button className="secondary-button" onClick={() => loadRemote()} disabled={syncing}>Atualizar do servidor</button></div></section>

    <section className={dirty ? "student-sync-strip sync-pending" : "student-sync-strip"}><div><span className="status-dot" /><strong>{dirty ? "Alterações locais pendentes" : "Sincronizado com o servidor"}</strong></div><span>Revisão {remote.revision ?? company.revision ?? 0}</span><span>Atualizado {formatDate(remote.updated_at || company.updated_at)}</span><span>{user.email}</span></section>
    {error ? <div className="workspace-alert workspace-alert-error">{error}</div> : null}{notice ? <div className="workspace-alert workspace-alert-success">{notice}</div> : null}

    <section className="student-progress"><div><strong>Semana {week}{duration ? ` de ${duration}` : ""}</strong><span>{duration ? `${number.format(progress)}% da simulação` : "Duração não definida"}</span></div><div className="student-progress-track"><span style={{ width: `${progress}%` }} /></div></section>

    <section className="student-metrics-grid"><Metric label="Caixa" value={money.format(Number(company.caixa || 0))} /><Metric label="Preço" value={money.format(Number(company.preco || 0))} /><Metric label="Clientes ativos" value={integer.format(Number(company.clientes_ativos || 0))} /><Metric label="Reputação" value={number.format(Number(company.reputacao || 0))} /><Metric label="Receita acumulada" value={indicators ? money.format(Number(indicators.Receita || 0)) : "…"} /><Metric label="Resultado acumulado" value={indicators ? money.format(Number(indicators.Resultado || 0)) : "…"} /><Metric label="Vendas acumuladas" value={indicators ? integer.format(Number(indicators.Vendas || 0)) : "…"} /><Metric label="Score JED" value={score ? number.format(Number(score.Total || 0)) : "…"} detail="calculado pelo Core Go" /></section>

    <section className="workspace-two-col student-editor-layout">
      <article className="workspace-card"><p className="eyebrow">Decisões</p><h2>Próxima semana</h2><div className="decision-grid"><label>Preço<input type="number" step="0.01" min="0" value={company.preco ?? 0} onChange={(e) => edit("preco", Number(e.target.value))} disabled={disabled} /></label><label>Marketing semanal<input type="number" step="1" min="0" value={company.marketing_semanal ?? 0} onChange={(e) => edit("marketing_semanal", Number(e.target.value))} disabled={disabled} /></label><label>Desconto promocional (%)<input type="number" step="1" min="0" max="35" value={company.promocao_desconto ?? 0} onChange={(e) => edit("promocao_desconto", Number(e.target.value))} disabled={disabled} /></label><label>Funcionários<input type="number" step="1" min="0" value={company.funcionarios ?? 0} onChange={(e) => edit("funcionarios", Math.max(0, Math.trunc(Number(e.target.value))))} disabled={disabled} /></label><label className="toggle-row"><input type="checkbox" checked={Boolean(company.delivery)} onChange={(e) => edit("delivery", e.target.checked)} disabled={disabled} /><span>Usar delivery</span></label></div><CheckList title="Canais digitais" items={core.channels} selected={company.canais_digitais || []} onToggle={(id) => toggleList("canais_digitais", id)} disabled={disabled} /><CheckList title="Ferramentas digitais" items={core.tools} selected={company.ferramentas_digitais || []} onToggle={(id) => toggleList("ferramentas_digitais", id)} disabled={disabled} /></article>

      <article className="workspace-card process-card"><p className="eyebrow">Rodada</p><h2>Processar e sincronizar</h2><p className="student-muted">O processamento ocorre localmente no navegador pelo mesmo motor Go da versão Windows. Depois, a empresa é enviada ao JED Servidor.</p>{last ? <dl className="student-data-list"><div><dt>Última semana</dt><dd>{last.semana}</dd></div><div><dt>Vendas</dt><dd>{integer.format(Number(last.vendas || 0))}</dd></div><div><dt>Receita</dt><dd>{money.format(Number(last.receita || 0))}</dd></div><div><dt>Resultado</dt><dd>{money.format(Number(last.resultado || 0))}</dd></div><div><dt>Evento</dt><dd>{last.evento || "Nenhum"}</dd></div></dl> : null}<div className="process-actions"><button className="primary-button" onClick={processWeek} disabled={disabled || core.state !== "ready" || (duration > 0 && week >= duration)}>{processed ? "Semana processada" : "Processar semana"}</button><button className="secondary-button" onClick={syncCompany} disabled={!dirty || syncing}>{syncing ? "Sincronizando…" : "Sincronizar com servidor"}</button></div>{dirty ? <small className="draft-note">Rascunho protegido no armazenamento local deste navegador.</small> : null}</article>
    </section>

    <section className="workspace-section"><div className="workspace-section-head"><div><p className="eyebrow">Turmas</p><h2>Vínculos</h2></div></div><div className="class-membership"><div>{classes.length ? classes.map((cl) => <span className="membership-pill" key={cl.id}>{cl.name} · {cl.join_code}</span>) : <span className="student-muted">Nenhuma turma vinculada.</span>}</div><form className="inline-form" onSubmit={joinClass}><input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Código da turma" /><button className="secondary-button">Entrar em turma</button></form></div></section>
  </>;
}
