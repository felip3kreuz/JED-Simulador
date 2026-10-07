import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import StudentWorkspace from "@/components/student-workspace";
import { requireRole } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aluno · JED Simulador" };

export default async function AlunoPage() {
  const user = await requireRole("aluno");
  return <main><header className="topbar dashboard-topbar"><Link className="brand-link" href="/"><span className="brand-mark">JED</span><span><span className="brand-name">JED Simulador</span><span className="brand-edition">Web · RC1.8</span></span></Link><span className="build-badge">W6.0</span><div className="user-menu student-user-menu"><div><strong>{user.name}</strong><span>Aluno</span></div><LogoutButton /></div></header><StudentWorkspace user={user} /></main>;
}
