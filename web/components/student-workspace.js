"use client";

import { useEffect, useMemo, useState } from "react";
import { createJEDClient } from "@/lib/jed-core";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function CompanyPicker({ companies, selectedID, onChange }) {
  if (companies.length <= 1) return null;
  return (
    <label className="company-picker">
      <span>Empresa</span>
      <select value={selectedID} onChange={(event) => onChange(event.target.value)}>
        {companies.map((remote) => (
          <option key={remote.id} value={remote.id}>
            {remote.company?.nome || remote.company?.local_id || "Empresa sem nome"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value, detail }) {
  return (
    <article className="student-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function EmptyState({ onReload }) {
  return (
    <section className="student-empty">
      <p className="eyebrow">Nenhuma empresa sincronizada</p>
      <h2>Ainda não há uma empresa desta conta no JED Servidor.</h2>
      <p>
        A W5.0 lê empresas já sincronizadas pela versão Windows. A criação de empresa diretamente
        pelo navegador será acrescentada numa etapa posterior do W5.
      </p>
      <button className="secondary-button" type="button" onClick={onReload}>Verificar novamente</button>
    </section>
  );
}

export default function StudentWorkspace({ user }) {
  const [companies, setCompanies] = useState([]);
  const [selectedID, setSelectedID] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coreData, setCoreData] = useState({ state: "idle", indicators: null, score: null, error: "" });

  async function loadCompanies() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/companies", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar empresas.");
      const list = Array.isArray(payload?.companies) ? payload.companies : [];
      setCompanies(list);
      setSelectedID((current) => {
        if (current && list.some((item) => item.id === current)) return current;
        return list[0]?.id || "";
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  const selected = useMemo(
    () => companies.find((item) => item.id === selectedID) || companies[0] || null,
    [companies, selectedID],
  );

  useEffect(() => {
    let cancelled = false;
    let client;

    async function calculate() {
      if (!selected?.company) {
        setCoreData({ state: "idle", indicators: null, score: null, error: "" });
        return;
      }
      setCoreData({ state: "loading", indicators: null, score: null, error: "" });
      try {
        client = await createJEDClient(1);
        const indicators = client.indicators(selected.company);
        const score = client.score(selected.company);
        if (!cancelled) setCoreData({ state: "ready", indicators, score, error: "" });
      } catch (caught) {
        if (!cancelled) {
          setCoreData({
            state: "error",
            indicators: null,
            score: null,
            error: caught instanceof Error ? caught.message : "Falha ao consultar o JED Core.",
          });
        }
      }
    }

    void calculate();
    return () => {
      cancelled = true;
      if (client) {
        try { client.close(); } catch { /* runtime em descarte */ }
      }
    };
  }, [selected]);

  if (loading) {
    return <section className="student-loading">Carregando empresas do JED Servidor…</section>;
  }

  if (error) {
    return (
      <section className="student-error">
        <strong>Não foi possível carregar a empresa.</strong>
        <span>{error}</span>
        <button className="secondary-button" type="button" onClick={loadCompanies}>Tentar novamente</button>
      </section>
    );
  }

  if (!companies.length) return <EmptyState onReload={loadCompanies} />;

  const remote = selected;
  const company = remote.company || {};
  const indicators = coreData.indicators;
  const score = coreData.score;
  const lastRecord = Array.isArray(company.historico) && company.historico.length
    ? company.historico[company.historico.length - 1]
    : null;
  const duration = Number(company.duracao_semanas || 0);
  const week = Number(company.semana || 0);
  const progress = duration > 0 ? Math.min(100, Math.max(0, (week / duration) * 100)) : 0;

  return (
    <>
      <section className="student-company-head">
        <div>
          <p className="eyebrow">Empresa sincronizada</p>
          <h1>{company.nome || "Empresa sem nome"}</h1>
          <p className="lede">
            {company.modelo_base || company.especialidade || "Modelo não informado"}
            {company.setor ? ` · ${company.setor}` : ""}
          </p>
        </div>
        <div className="student-company-actions">
          <CompanyPicker companies={companies} selectedID={remote.id} onChange={setSelectedID} />
          <button className="secondary-button" type="button" onClick={loadCompanies}>Atualizar do servidor</button>
        </div>
      </section>

      <section className="student-sync-strip">
        <div><span className="status-dot" /><strong>Conectado ao JED Servidor</strong></div>
        <span>Revisão {remote.revision ?? company.revision ?? 0}</span>
        <span>Atualizado {formatDate(remote.updated_at || company.updated_at)}</span>
        <span>{user.email}</span>
      </section>

      <section className="student-progress" aria-label="Progresso da simulação">
        <div>
          <strong>Semana {week}{duration ? ` de ${duration}` : ""}</strong>
          <span>{duration ? `${number.format(progress)}% da simulação` : "Duração não definida"}</span>
        </div>
        <div className="student-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </section>

      <section className="student-metrics-grid" aria-label="Estado atual da empresa">
        <Metric label="Caixa" value={money.format(Number(company.caixa || 0))} />
        <Metric label="Preço" value={money.format(Number(company.preco || 0))} />
        <Metric label="Clientes ativos" value={integer.format(Number(company.clientes_ativos || 0))} />
        <Metric label="Reputação" value={number.format(Number(company.reputacao || 0))} detail="escala do JED" />
        <Metric
          label="Receita acumulada"
          value={coreData.state === "ready" ? money.format(Number(indicators?.Receita || 0)) : "…"}
        />
        <Metric
          label="Resultado acumulado"
          value={coreData.state === "ready" ? money.format(Number(indicators?.Resultado || 0)) : "…"}
        />
        <Metric
          label="Vendas acumuladas"
          value={coreData.state === "ready" ? integer.format(Number(indicators?.Vendas || 0)) : "…"}
        />
        <Metric
          label="Score JED"
          value={coreData.state === "ready" ? number.format(Number(score?.Total || 0)) : "…"}
          detail="calculado no navegador"
        />
      </section>

      {coreData.state === "error" ? (
        <section className="student-core-error">
          <strong>Empresa carregada, mas o JED Core não pôde calcular os indicadores.</strong>
          <span>{coreData.error}</span>
        </section>
      ) : null}

      <section className="student-detail-grid">
        <article className="student-panel">
          <p className="eyebrow">Operação</p>
          <h2>Estado da empresa</h2>
          <dl className="student-data-list">
            <div><dt>Operação</dt><dd>{company.operacao || "—"}</dd></div>
            <div><dt>Funcionários</dt><dd>{integer.format(Number(company.funcionarios || 0))}</dd></div>
            <div><dt>Marketing semanal</dt><dd>{money.format(Number(company.marketing_semanal || 0))}</dd></div>
            <div><dt>Concorrência</dt><dd>{company.concorrencia_nivel || "—"}</dd></div>
            <div><dt>Estoque</dt><dd>{company.usa_estoque ? `${integer.format(Number(company.estoque_unidades || 0))} un.` : "Não utiliza"}</dd></div>
            <div><dt>Insumos</dt><dd>{company.usa_insumos ? `${company.insumos?.length || 0} cadastrados` : "Não utiliza"}</dd></div>
          </dl>
        </article>

        <article className="student-panel">
          <p className="eyebrow">Última rodada</p>
          <h2>{lastRecord ? `Semana ${lastRecord.semana}` : "Ainda sem rodadas"}</h2>
          {lastRecord ? (
            <dl className="student-data-list">
              <div><dt>Vendas</dt><dd>{integer.format(Number(lastRecord.vendas || 0))}</dd></div>
              <div><dt>Receita</dt><dd>{money.format(Number(lastRecord.receita || 0))}</dd></div>
              <div><dt>Resultado</dt><dd>{money.format(Number(lastRecord.resultado || 0))}</dd></div>
              <div><dt>Conversão</dt><dd>{number.format(Number(lastRecord.conversao_observada_pct || 0))}%</dd></div>
              <div><dt>Evento</dt><dd>{lastRecord.evento || "Nenhum"}</dd></div>
              <div><dt>Gargalo</dt><dd>{lastRecord.gargalo || "Nenhum"}</dd></div>
            </dl>
          ) : (
            <p className="student-muted">A empresa ainda não possui histórico semanal.</p>
          )}
        </article>
      </section>

      <section className="student-next-step">
        <div>
          <p className="eyebrow">W5.0</p>
          <h2>Leitura real concluída.</h2>
        </div>
        <p>
          A empresa vem do JED Servidor e os indicadores são calculados pelo JED Core em WebAssembly.
          Edição de decisões e processamento de semana permanecem bloqueados nesta subversão.
        </p>
      </section>
    </>
  );
}
