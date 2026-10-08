import Link from "next/link";
import CoreStatus from "./core-status";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

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
            <Link href="/login" className="orbit-command accent-cyan"><strong>JED ONLINE</strong><span>Entrar com uma conta cadastrada por um Administrador.</span></Link>
            <div className="orbit-command"><strong>CADASTRO CENTRALIZADO</strong><span>Contas de Aluno, Mentor e Administrador são criadas exclusivamente no painel administrativo.</span></div>
            <div className="orbit-command"><strong>PRIMEIRO ACESSO</strong><span>Use a senha temporária recebida por e-mail e substitua-a por uma senha pessoal.</span></div>
            <div className="orbit-core-box"><CoreStatus /></div>
          </div>
        </section>
        <footer className="orbit-footer"><span>JED SIMULADOR · RC1.8</span><span>WEB W7.1 · CADASTRO CENTRALIZADO</span></footer>
      </main>
    </div>
  );
}
