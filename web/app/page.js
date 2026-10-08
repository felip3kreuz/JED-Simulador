import Link from "next/link";
import CoreStatus from "./core-status";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

const commands = [
  ["/login", "JED ONLINE", "Entrar com uma conta existente.", "accent-cyan"],
  ["/cadastro/aluno", "CADASTRAR ALUNO", "Criar conta de aluno e definir senha.", ""],
  ["/cadastro/mentor", "CADASTRAR MENTOR", "Ativar uma credencial MTR e definir senha.", ""],
  ["/cadastro/convite", "ATIVAR CONVITE", "Ativar convite individual emitido por Mentor.", "accent-amber"],
];

export default function Home() {
  return (
    <div className="public-orbit-page">
      <JEDChrome />
      <main className="orbit-frame home-orbit-frame">
        <PublicScreenTitle title="PAINEL DE INICIALIZAÇÃO" subtitle="ambiente de simulação empresarial • versão web" />
        <section className="orbit-home-grid">
          <div className="orbit-dial" aria-label="JED pronto">
            <div className="orbit-dial-ring orbit-dial-ring-a" />
            <div className="orbit-dial-ring orbit-dial-ring-b" />
            <div className="orbit-dial-core"><strong>JED</strong><span>EMPREENDEDORISMO EM JOGO</span><b>READY</b></div>
          </div>
          <div className="orbit-command-stack">
            {commands.map(([href, title, detail, cls]) => <Link href={href} className={`orbit-command ${cls}`} key={title}><strong>{title}</strong><span>{detail}</span></Link>)}
            <div className="orbit-core-box"><CoreStatus /></div>
          </div>
        </section>
        <footer className="orbit-footer"><span>JED SIMULADOR · RC1.8</span><span>WEB W6.1 · ONBOARDING + INTERFACE</span></footer>
      </main>
    </div>
  );
}
