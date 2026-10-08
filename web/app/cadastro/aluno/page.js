import RegistrationForm from "@/components/registration-form";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

export const metadata = { title: "Cadastrar Aluno · JED Simulador" };
export default function StudentRegisterPage() {
  return <div className="public-orbit-page"><JEDChrome /><main className="orbit-frame auth-orbit-frame"><PublicScreenTitle title="JED ONLINE" subtitle="cadastro público • perfil aluno" /><div className="orbit-auth-grid"><div className="orbit-auth-copy"><span className="orbit-index">02 / ALUNO</span><h2>CRIE SUA PRÓPRIA CONTA.</h2><p>O cadastro do Aluno é livre. Você define a senha aqui e usa o código da turma depois de entrar.</p></div><RegistrationForm mode="student" /></div></main></div>;
}
