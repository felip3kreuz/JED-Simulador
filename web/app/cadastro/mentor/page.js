import RegistrationForm from "@/components/registration-form";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

export const metadata = { title: "Cadastrar Mentor · JED Simulador" };
export default function MentorRegisterPage() {
  return <div className="public-orbit-page"><JEDChrome /><main className="orbit-frame auth-orbit-frame"><PublicScreenTitle title="JED ONLINE" subtitle="credenciamento • perfil mentor" /><div className="orbit-auth-grid"><div className="orbit-auth-copy"><span className="orbit-index">03 / MENTOR</span><h2>ATIVE SUA CREDENCIAL MTR.</h2><p>Use o código emitido pelo Administrador. A senha é pessoal e nasce somente nesta etapa.</p></div><RegistrationForm mode="mentor" /></div></main></div>;
}
