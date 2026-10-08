import LoginForm from "./login-form";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

export const metadata = { title: "Entrar · JED Simulador" };

export default function LoginPage() {
  return (
    <div className="public-orbit-page">
      <JEDChrome />
      <main className="orbit-frame auth-orbit-frame">
        <PublicScreenTitle title="JED ONLINE" subtitle="contas • turmas • administração • sincronização" />
        <div className="orbit-auth-grid">
          <div className="orbit-auth-copy">
            <span className="orbit-index">01 / ACESSO</span>
            <h2>NENHUMA SESSÃO ATIVA</h2>
            <p>Aluno cria a própria conta. Mentor precisa de uma credencial MTR. Administrador nunca é criado pelo cadastro público.</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
