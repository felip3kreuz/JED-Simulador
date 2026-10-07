import CoreStatus from "./core-status";

const roles = [
  {
    name: "Aluno",
    description: "Decisões, operação da empresa, indicadores e sincronização.",
    stage: "Interface no W5",
  },
  {
    name: "Mentor",
    description: "Turmas, cenários, rodadas, resultados e acompanhamento.",
    stage: "Interface no W6",
  },
  {
    name: "Administrador",
    description: "Usuários, mentores, configuração, segurança e operação.",
    stage: "Interface no W6",
  },
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">JED</div>
        <div>
          <div className="brand-name">JED Simulador</div>
          <div className="brand-edition">Web · RC1.8</div>
        </div>
        <span className="build-badge">W3</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Primeira execução web</p>
          <h1>O mesmo motor do JED, agora no navegador.</h1>
          <p className="lede">
            Esta build valida a aplicação Next.js, a execução do motor Go via WebAssembly e a
            estrutura que receberá os três papéis do sistema.
          </p>
        </div>
        <div className="hero-panel">
          <CoreStatus />
        </div>
      </section>

      <section className="section-block" aria-labelledby="perfis">
        <div className="section-heading">
          <p className="eyebrow">Perfis</p>
          <h2 id="perfis">Uma interface para cada papel</h2>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.name}>
              <div className="role-kicker">{role.stage}</div>
              <h3>{role.name}</h3>
              <p>{role.description}</p>
              <button type="button" disabled>
                Em preparação
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="architecture" aria-labelledby="arquitetura">
        <div>
          <p className="eyebrow">Arquitetura atual</p>
          <h2 id="arquitetura">A interface mudou. O motor não.</h2>
        </div>
        <div className="architecture-flow" aria-label="Fluxo da aplicação">
          <span>Next.js</span>
          <b>→</b>
          <span>WebAssembly</span>
          <b>→</b>
          <span>JED Core · Go</span>
        </div>
        <p className="architecture-note">
          A conexão autenticada com o JED Servidor entra no W4. Nesta etapa, nenhum dado de usuário
          é enviado para a rede.
        </p>
      </section>

      <footer>
        JED Simulador · Web W3 · Base v2.0 RC1.8
      </footer>
    </main>
  );
}
