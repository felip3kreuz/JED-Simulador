"use client";

import { useEffect, useMemo, useState } from "react";
import { createJEDClient } from "@/lib/jed-core";
import Modal from "@/components/modal";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
function fmtDate(value) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d); }

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} }
  return <button type="button" className="code-button" onClick={copy}><code>{code}</code><span>{copied ? "COPIADO" : "COPIAR"}</span></button>;
}
function DataRow({ label, value }) { return <div><dt>{label}</dt><dd>{value ?? "—"}</dd></div>; }

export default function MentorWorkspace({ user }) {
  const [activeView, setActiveView] = useState("visao-geral");
  const [data, setData] = useState({ classes: [], companies: [], students: [], scenarios: [] });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState("");
  const [classForm, setClassForm] = useState({ name: "", scenario_id: "" });
  const [scenarioForm, setScenarioForm] = useState({ nome: "", alcance: 1, conversao: 1, oscilacao: 0.08, evento_negativo_extra: 0, duracao: 12, concorrencia_nivel: "media", concorrencia_indice: 1, dificuldade: "intermediario", observacoes: "" });
  const [evaluationForm, setEvaluationForm] = useState({ company_id: "", company_name: "", status: "aprovado", comment: "" });

  useEffect(() => {
    const onNavigate = (event) => {
      if (event?.detail?.role !== "mentor") return;
      const view = String(event.detail.view || "visao-geral");
      setActiveView(view);
      window.dispatchEvent(new CustomEvent("jed:view", { detail: { role: "mentor", view } }));
    };
    window.addEventListener("jed:navigate", onNavigate);
    return () => window.removeEventListener("jed:navigate", onNavigate);
  }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const [overviewResponse, scenariosResponse] = await Promise.all([
        fetch("/api/mentor/overview", { cache: "no-store" }),
        fetch("/api/mentor/scenarios", { cache: "no-store" }),
      ]);
      const overview = await overviewResponse.json();
      const scenarioPayload = await scenariosResponse.json();
      if (!overviewResponse.ok) throw new Error(overview?.error || "Falha ao carregar painel.");
      if (!scenariosResponse.ok) throw new Error(scenarioPayload?.error || "Falha ao carregar cenários.");
      const next = {
        classes: Array.isArray(overview.classes) ? overview.classes : [],
        companies: Array.isArray(overview.companies) ? overview.companies : [],
        students: Array.isArray(overview.students) ? overview.students : [],
        scenarios: Array.isArray(scenarioPayload.scenarios) ? scenarioPayload.scenarios : [],
      };
      setData(next);
      setClassForm((current) => ({ ...current, scenario_id: current.scenario_id || next.scenarios[0]?.id || "" }));
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
    for (const remote of data.companies) (map[remote.class_id || "sem-turma"] ||= []).push(remote);
    return map;
  }, [data.companies]);

  function classesForStudent(id) { return data.classes.filter((cl) => cl.student_ids?.includes(id)).map((cl) => cl.name).join(", ") || "—"; }
  function activate(view) { setActiveView(view); window.dispatchEvent(new CustomEvent("jed:view", { detail: { role: "mentor", view } })); }

  async function createClass(event) {
    event.preventDefault();
    const scenarioEntry = data.scenarios.find((item) => item.id === classForm.scenario_id);
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mentor/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: classForm.name.trim(), scenario: scenarioEntry?.scenario || {} }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar turma.");
      setClassForm((current) => ({ ...current, name: "" })); setDialog(""); setNotice(`Turma ${payload.class?.name || "criada"} criada. Código: ${payload.class?.join_code || "—"}`); await load(); activate("turmas");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao criar turma."); }
    finally { setBusy(false); }
  }

  async function createScenario(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mentor/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scenarioForm) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar cenário.");
      setScenarioForm({ nome: "", alcance: 1, conversao: 1, oscilacao: 0.08, evento_negativo_extra: 0, duracao: 12, concorrencia_nivel: "media", concorrencia_indice: 1, dificuldade: "intermediario", observacoes: "" });
      setDialog(""); setNotice(`Cenário ${payload.scenario?.scenario?.nome || "criado"} salvo no servidor.`); await load(); activate("cenarios");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao criar cenário."); }
    finally { setBusy(false); }
  }

  function openEvaluation(remote) {
    setEvaluationForm({
      company_id: remote.id,
      company_name: remote.company?.nome || "Empresa",
      status: remote.approval_status === "reprovado" ? "reprovado" : "aprovado",
      comment: remote.mentor_comment || "",
    });
    setError(""); setNotice(""); setDialog("evaluation");
  }

  async function saveEvaluation(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mentor/companies/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: evaluationForm.company_id, status: evaluationForm.status, comment: evaluationForm.comment }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar avaliação.");
      const updated = payload.company;
      setData((current) => ({ ...current, companies: current.companies.map((item) => item.id === updated.id ? updated : item) }));
      setDialog("");
      setNotice(`${evaluationForm.company_name}: ${evaluationForm.status.toUpperCase()}. Parecer salvo.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao salvar avaliação."); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="workspace-loading">CARREGANDO TURMAS, CENÁRIOS E EMPRESAS…</section>;

  function renderOverview() {
    return <><section className="orbit-overview-strip"><div><span>SESSÃO</span><strong>MENTOR / {user.name}</strong><small>{user.institution || "Instituição não informada"} · JED Online</small></div><div className="orbit-stat-row"><div><span>TURMAS</span><strong>{data.classes.length}</strong></div><div><span>EMPRESAS</span><strong>{data.companies.length}</strong></div><div><span>ALUNOS</span><strong>{data.students.length}</strong></div><div><span>CENÁRIOS</span><strong>{data.scenarios.length}</strong></div></div></section><div className="orbit-toolbar"><button className="primary-button" onClick={() => setDialog("class")}>CRIAR TURMA</button><button className="secondary-button" onClick={() => setDialog("scenario")}>NOVO CENÁRIO</button><button className="secondary-button" onClick={load}>ATUALIZAR</button></div><div className="dashboard-module-grid"><button className="module-tile" onClick={() => activate("cenarios")}><span>01</span><strong>CENÁRIOS</strong><small>{data.scenarios.length} ambientes disponíveis</small></button><button className="module-tile" onClick={() => activate("turmas")}><span>02</span><strong>TURMAS</strong><small>códigos, cenário e alunos</small></button><button className="module-tile" onClick={() => activate("alunos")}><span>03</span><strong>ALUNOS</strong><small>contas cadastradas pelo Administrador</small></button><button className="module-tile" onClick={() => activate("resultados")}><span>04</span><strong>RESULTADOS</strong><small>empresas sincronizadas</small></button></div></>;
  }
  function renderScenarios() {
    return <><div className="workspace-section-head"><div><p className="eyebrow">CENÁRIOS</p><h2>Ambientes pedagógicos</h2></div><button className="primary-button" onClick={() => setDialog("scenario")}>NOVO CENÁRIO</button></div><p className="section-help">Cenários personalizados ficam no servidor e podem ser reutilizados em novas turmas.</p><div className="scenario-grid">{data.scenarios.map((entry) => { const sc = entry.scenario || {}; return <article className="workspace-card scenario-card" key={entry.id}><div className="scenario-title"><div><span className="technical-label">{entry.builtin ? "BASE JED" : "PERSONALIZADO"}</span><h3>{sc.nome}</h3></div><span className={entry.builtin ? "state-label used" : "state-label active"}>{entry.builtin ? "PADRÃO" : "SALVO"}</span></div><dl className="student-data-list"><DataRow label="Duração" value={`${sc.duracao || 12} semanas`} /><DataRow label="Dificuldade" value={sc.dificuldade || "intermediario"} /><DataRow label="Alcance" value={number.format(Number(sc.alcance || 1))} /><DataRow label="Conversão" value={number.format(Number(sc.conversao || 1))} /><DataRow label="Oscilação" value={number.format(Number(sc.oscilacao || 0))} /><DataRow label="Concorrência" value={sc.concorrencia_nivel || "media"} /></dl>{sc.observacoes ? <p className="student-muted">{sc.observacoes}</p> : null}</article>; })}</div></>;
  }
  function renderClasses() {
    return <><div className="workspace-section-head"><div><p className="eyebrow">TURMAS</p><h2>Organização online</h2></div><button className="primary-button" onClick={() => setDialog("class")}>CRIAR TURMA</button></div><div className="class-grid">{data.classes.length ? data.classes.map((cl) => { const list = companiesByClass[cl.id] || []; return <article className="workspace-card orbit-class-card" key={cl.id}><div className="class-title"><div><span className="technical-label">TURMA</span><h3>{cl.name}</h3><CopyCode code={cl.join_code} /></div><strong>{cl.student_ids?.length || 0} ALUNOS</strong></div><dl className="student-data-list"><DataRow label="Cenário" value={cl.scenario?.nome || "Mercado estável"} /><DataRow label="Duração" value={`${cl.scenario?.duracao || 12} semanas`} /><DataRow label="Dificuldade" value={cl.scenario?.dificuldade || "intermediario"} /><DataRow label="Empresas sincronizadas" value={list.length} /></dl></article>; }) : <article className="workspace-card"><p className="student-muted">Nenhuma turma criada.</p></article>}</div></>;
  }
  function renderStudents() {
    return <><div className="workspace-section-head"><div><p className="eyebrow">ALUNOS</p><h2>Alunos vinculados às suas turmas</h2></div><button className="secondary-button" onClick={load}>ATUALIZAR</button></div><p className="section-help">O cadastro de Alunos é exclusivo do Administrador. Depois de cadastrados, eles podem entrar nas turmas usando o código da turma.</p><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Aluno</th><th>E-mail</th><th>ID institucional</th><th>Turmas</th><th>Status</th></tr></thead><tbody>{data.students.length ? data.students.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.email}</td><td>{student.institutional_id || "—"}</td><td>{classesForStudent(student.id)}</td><td>{student.status === "disabled" ? <span className="state-label revoked">DESATIVADO</span> : <span className="state-label active">ATIVO</span>}</td></tr>) : <tr><td colSpan="5" className="empty-cell">Nenhum Aluno vinculado às suas turmas.</td></tr>}</tbody></table></div></>;
  }
  function renderResults() {
    return <><div className="workspace-section-head"><div><p className="eyebrow">RESULTADOS</p><h2>Empresas sincronizadas</h2></div><button className="secondary-button" onClick={load}>ATUALIZAR</button></div><p className="section-help">Classifique cada empreendimento como APROVADO ou REPROVADO e registre o parecer pedagógico. O Aluno verá a classificação e os comentários na área da empresa.</p><div className="table-wrap"><table className="workspace-table results-table"><thead><tr><th>Turma</th><th>Responsável</th><th>Empresa</th><th>Semana</th><th>Score JED</th><th>Avaliação</th><th>Parecer</th><th>Ação</th></tr></thead><tbody>{data.companies.length ? [...data.companies].sort((a,b) => Number(scores[b.id] || 0) - Number(scores[a.id] || 0)).map((remote) => { const company = remote.company || {}; const status = remote.approval_status || ""; return <tr key={remote.id}><td>{data.classes.find((cl) => cl.id === remote.class_id)?.name || "Sem turma"}</td><td>{company.responsavel || remote.owner_id}</td><td><strong>{company.nome || "Empresa"}</strong><small>{company.especialidade || company.modelo_base || ""}</small></td><td>{company.semana || 0}/{company.duracao_semanas || "—"}</td><td><strong>{number.format(Number(scores[remote.id] || 0))}</strong></td><td>{status === "aprovado" ? <span className="state-label approved">APROVADO</span> : status === "reprovado" ? <span className="state-label rejected">REPROVADO</span> : <span className="state-label used">NÃO AVALIADO</span>}</td><td className="mentor-comment-cell">{remote.mentor_comment ? <><span>{remote.mentor_comment}</span><small>{remote.evaluated_by_name || "Mentor"} · {fmtDate(remote.evaluated_at)}</small></> : "—"}</td><td><button type="button" className="secondary-button compact-button" onClick={() => openEvaluation(remote)}>{status ? "REAVALIAR" : "AVALIAR"}</button></td></tr>; }) : <tr><td colSpan="8" className="empty-cell">Nenhuma empresa sincronizada.</td></tr>}</tbody></table></div></>;
  }

  const view = activeView === "visao-geral" ? renderOverview() : activeView === "cenarios" ? renderScenarios() : activeView === "turmas" ? renderClasses() : activeView === "alunos" ? renderStudents() : renderResults();
  return <>{error ? <div className="workspace-alert workspace-alert-error">ERRO · {error}</div> : null}{notice ? <div className="workspace-alert workspace-alert-success">OK · {notice}</div> : null}<section id={activeView} className="module-view">{view}</section>
    <Modal open={dialog === "class"} title="CRIAR TURMA ONLINE" subtitle="Escolha um cenário e gere um código para os Alunos." onClose={() => setDialog("")}><form className="orbit-form" onSubmit={createClass}><label>NOME DA TURMA<input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required /></label><label>CENÁRIO<select value={classForm.scenario_id} onChange={(e) => setClassForm({ ...classForm, scenario_id: e.target.value })}>{data.scenarios.map((entry) => <option key={entry.id} value={entry.id}>{entry.scenario?.nome || entry.id}{entry.builtin ? " · base" : " · personalizado"}</option>)}</select></label><div className="activation-note"><strong>CÓDIGO</strong><span>Será gerado automaticamente ao criar a turma.</span></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={busy || !classForm.name.trim()}>CRIAR TURMA</button></div></form></Modal>
    <Modal open={dialog === "scenario"} title="NOVO CENÁRIO" subtitle="Crie um ambiente pedagógico reutilizável nas turmas." onClose={() => setDialog("")}><form className="orbit-form" onSubmit={createScenario}><label>NOME<input value={scenarioForm.nome} onChange={(e) => setScenarioForm({ ...scenarioForm, nome: e.target.value })} placeholder="Piloto - Mercado Estável" required /></label><div className="orbit-form-three"><label>DURAÇÃO<input type="number" min="1" value={scenarioForm.duracao} onChange={(e) => setScenarioForm({ ...scenarioForm, duracao: Number(e.target.value) })} /></label><label>DIFICULDADE<select value={scenarioForm.dificuldade} onChange={(e) => setScenarioForm({ ...scenarioForm, dificuldade: e.target.value })}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label><label>CONCORRÊNCIA<select value={scenarioForm.concorrencia_nivel} onChange={(e) => setScenarioForm({ ...scenarioForm, concorrencia_nivel: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label></div><div className="orbit-form-four"><label>ALCANCE<input type="number" min="0.1" step="0.01" value={scenarioForm.alcance} onChange={(e) => setScenarioForm({ ...scenarioForm, alcance: Number(e.target.value) })} /></label><label>CONVERSÃO<input type="number" min="0.1" step="0.01" value={scenarioForm.conversao} onChange={(e) => setScenarioForm({ ...scenarioForm, conversao: Number(e.target.value) })} /></label><label>OSCILAÇÃO<input type="number" min="0" step="0.01" value={scenarioForm.oscilacao} onChange={(e) => setScenarioForm({ ...scenarioForm, oscilacao: Number(e.target.value) })} /></label><label>EVENTO NEG. EXTRA<input type="number" min="-0.5" max="0.5" step="0.01" value={scenarioForm.evento_negativo_extra} onChange={(e) => setScenarioForm({ ...scenarioForm, evento_negativo_extra: Number(e.target.value) })} /></label></div><label>OBSERVAÇÕES<textarea rows="3" value={scenarioForm.observacoes} onChange={(e) => setScenarioForm({ ...scenarioForm, observacoes: e.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={busy}>SALVAR CENÁRIO</button></div></form></Modal>
    <Modal open={dialog === "evaluation"} title="AVALIAR EMPREENDIMENTO" subtitle={evaluationForm.company_name || "Empresa do Aluno"} onClose={() => setDialog("")}><form className="orbit-form" onSubmit={saveEvaluation}><div className="evaluation-choice-grid"><label className={evaluationForm.status === "aprovado" ? "evaluation-choice selected" : "evaluation-choice"}><input type="radio" name="evaluation-status" value="aprovado" checked={evaluationForm.status === "aprovado"} onChange={() => setEvaluationForm({ ...evaluationForm, status: "aprovado" })} /><strong>APROVADO</strong><span>O empreendimento atende aos critérios de avaliação.</span></label><label className={evaluationForm.status === "reprovado" ? "evaluation-choice selected" : "evaluation-choice"}><input type="radio" name="evaluation-status" value="reprovado" checked={evaluationForm.status === "reprovado"} onChange={() => setEvaluationForm({ ...evaluationForm, status: "reprovado" })} /><strong>REPROVADO</strong><span>O empreendimento ainda não atende aos critérios de avaliação.</span></label></div><label>COMENTÁRIOS DO MENTOR<textarea rows="6" maxLength="4000" value={evaluationForm.comment} onChange={(e) => setEvaluationForm({ ...evaluationForm, comment: e.target.value })} placeholder="Ex.: O empreendimento foi aprovado, mas com ressalvas quanto à validação do público-alvo..." /></label><small className="field-hint">{evaluationForm.comment.length}/4000 caracteres</small><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog("")}>CANCELAR</button><button className="primary-button" disabled={busy}>{busy ? "SALVANDO…" : "SALVAR AVALIAÇÃO"}</button></div></form></Modal>
  </>;
}
