import RoleDashboard from "@/components/role-dashboard";
import { requireRole } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aluno · JED Simulador" };

export default async function AlunoPage() {
  const user = await requireRole("aluno");
  return <RoleDashboard user={user} role="aluno" />;
}
