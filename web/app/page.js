import Link from "next/link";
import CoreStatus from "./core-status";

const roles = [
  { name: "Aluno", description: "Decisões, operação da empresa, indicadores e sincronização.", stage: "Painel autenticado" },
  { name: "Mentor", description: "Turmas, cenários, rodadas, resultados e acompanhamento.", stage: "Painel autenticado" },
  { name: "Administrador", description: "Usuários, mentores, configuração, segurança e operação.", stage: "Painel autenticado" },
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
        <Link className="header-login" href="/login">Entrar</Link>
        <span className="build-badge">W5.0</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">JED Web · W5.0</p>
          <h1>O motor e o servidor do JED, no navegador.</h1>
          <p className="lede">
            A aplicação mantém o motor Go em WebAssembly, autentica as mesmas contas do JED Servidor
            e já carrega o estado real das empresas dos Alunos.
          </p>
          <div className="hero-actions">
            <Link className="primary-button link-button" href="/login">Entrar no JED</Link>
          </div>
        </div>
        <div className="hero-panel"><CoreStatus /></div>
      </section>

      <section className="section-block" aria-labelledby="perfis">
        <div className="section-heading">
          <p className="eyebrow">Perfis</p>
          <h2 id="perfis">Uma sessão para cada papel</h2>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.name}>
              <div className="role-kicker">{role.stage}</div>
              <h3>{role.name}</h3>
              <p>{role.description}</p>
              <Link className="card-link" href="/login">Acessar</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="architecture" aria-labelledby="arquitetura">
        <div>
          <p className="eyebrow">Arquitetura W5.0</p>
          <h2 id="arquitetura">O token fica fora do JavaScript.</h2>
        </div>
        <div className="architecture-flow" aria-label="Fluxo da aplicação">
          <span>Navegador</span><b>→</b><span>Next.js BFF</span><b>→</b><span>JED Servidor</span>
        </div>
        <p className="architecture-note">
          O login é encaminhado pelo backend do JED Web. A sessão do servidor é armazenada em cookie
          Secure + HttpOnly, enquanto o JED Core continua executando localmente em WebAssembly.
        </p>
      </section>

      <footer>JED Simulador · Web W5.0 · Base v2.0 RC1.8</footer>
    </main>
  );
}
