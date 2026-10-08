import RegistrationForm from "@/components/registration-form";
import { JEDChrome, PublicScreenTitle } from "@/components/jed-shell";

export const metadata = { title: "Ativar Convite · JED Simulador" };
export default function InvitationRegisterPage() {
  return <div className="public-orbit-page"><JEDChrome /><main className="orbit-frame auth-orbit-frame"><PublicScreenTitle title="JED ONLINE" subtitle="ativação de convite individual de aluno" /><div className="orbit-auth-grid"><div className="orbit-auth-copy"><span className="orbit-index">04 / CONVITE</span><h2>ATIVE UM CONVITE INDIVIDUAL.</h2><p>Este fluxo mantém compatibilidade com convites de Aluno emitidos por Mentores.</p></div><RegistrationForm mode="invitation" /></div></main></div>;
}
