import Link from "next/link";
import CoreStatus from "./core-status";

const roles = [
  { name: "Aluno", description: "Decisões, processamento semanal, indicadores e sincronização com o servidor.", stage: "Jogável" },
  { name: "Mentor", description: "Turmas, convites, empresas sincronizadas e acompanhamento de resultados.", stage: "Operacional" },
  { name: "Administrador", description: "Usuários, permissões, Administradores e credenciais de Mentor.", stage: "Operacional" },
];

export default function Home() {
  return <main>
    <header className="topbar"><div className="brand-mark">JED</div><div><div className="brand-name">JED Simulador</div><div className="brand-edition">Web · RC1.8</div></div><Link className="header-login" href="/login">Entrar</Link><span className="build-badge">W6.0</span></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">RC1.8 Web Final · W6.0</p><h1>O JED completo, no navegador.</h1><p className="lede">O motor econômico continua em Go/WebAssembly, enquanto Aluno, Mentor e Administrador usam as mesmas contas e dados do JED Servidor.</p><div className="hero-actions"><Link className="primary-button link-button" href="/login">Entrar no JED</Link></div></div><div className="hero-panel"><CoreStatus /></div></section>
    <section className="section-block"><div className="section-heading"><p className="eyebrow">Perfis</p><h2>Um sistema, três áreas de trabalho</h2></div><div className="role-grid">{roles.map((role) => <article className="role-card" key={role.name}><div className="role-kicker">{role.stage}</div><h3>{role.name}</h3><p>{role.description}</p><Link className="card-link" href="/login">Acessar</Link></article>)}</div></section>
    <section className="architecture"><div><p className="eyebrow">Arquitetura final</p><h2>O mesmo Core para Windows e Web.</h2></div><div className="architecture-flow"><span>Navegador</span><b>→</b><span>JED Core WASM</span><b>↔</b><span>Next.js BFF</span><b>→</b><span>JED Servidor</span></div><p className="architecture-note">O token do servidor permanece em cookie Secure + HttpOnly. O processamento semanal acontece no JED Core em WebAssembly e a empresa sincronizada continua compatível com o protocolo RC1.8.</p></section>
    <footer>JED Simulador · RC1.8 Web Final · W6.0</footer>
  </main>;
}
