import Link from "next/link";
import LoginForm from "./login-form";

export const metadata = { title: "Entrar · JED Simulador" };

export default function LoginPage() {
  return (
    <main className="auth-main">
      <header className="topbar compact-topbar">
        <Link className="brand-link" href="/">
          <span className="brand-mark">JED</span>
          <span>
            <span className="brand-name">JED Simulador</span>
            <span className="brand-edition">Web · RC1.8</span>
          </span>
        </Link>
        <span className="build-badge">W4</span>
      </header>

      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow">Acesso ao ambiente online</p>
          <h1>Entre com sua conta JED.</h1>
          <p className="lede">
            O mesmo servidor da versão Windows autentica Administradores, Mentores e Alunos. Após o
            login, o papel da conta define automaticamente o painel exibido.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
